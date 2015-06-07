import * as React from "react"

// Simple class used to represent children of the
// virtual node. In fact single instance `NodeList.empty`
// is only use of it & it is used by all nodes that have
// no children.
class NodeList extends Array {
  constructor() {
    super()
    const length = arguments.length
    let index = 0
    while (index < length) {
      this[index] = arguments[index]
      index = index + 1
    }
    this.length = length
    Object.freeze(this)
  }
}
NodeList.empty = new NodeList()

// Type used to represent properties of the virtual
// node. It's primarily used when cloning virtual nodes,
// although empty maps are also used and populated during
// virtual node construction.
class PropertyMap {
  constructor(entries) {
    if (entries) {
      for (let name in entries) {
        if (entries.hasOwnProperty(name)) {
          this[name] = entries[name]
        }
      }
    }
  }
}

// Function is an equivalent of `document.dispatchEvent` although this
// function takes target virtual node and an action to disptach on it.
// `action` will be passed to a `receive` method of the node if it implements
// it or of a nearest ancestors does.
export const dispatch = (node, action) => {
  if (action !== null) {
    while (node && !node.receive) {
      node = node.props.parent
    }
    node.receive(action)
  }
}


// Entity is an abstract class that represent entities in the virtal dom tree.
// Note that not all entities in the graph are virtual nodes, some of them are
// thunks a.k.a react components that compute their virtual dom sub-tree lazily.
// Another non virtual node entities are fragments that represent namespaced
// list of virtual nodes. Plain react components are in fact also entities although
// they do not inherit from this Entity class as they are third party entities.
class Entity {
  // Every entity in the virtual dom tree is given a `parent` entity during construction via
  // `adopt` method. Method ensures that given `child` entity has a correct reference to it's
  // `parent`. If `child` is an orphan parent is just assigned to it (note that all virtual
  // nodes start as orphans as children tend to be constracted ahead of their parents). If
  // `child` already has a different parent, which can occur if same entity is re-used in the
  // different branches of the dom tree, then `child` is cloned (with all of it's children) and
  // returned (parent is assigned to a returned clone). Some children maybe primitive values
  // like string which are returned as is.
  adopt(child) {
    if (child instanceof Entity) {
      const {parent} = child.props
      if (parent == null) {
        child.props.parent = this
      } else if (parent !== this) {
        child = child.clone()
        child.proprs.parent = this
      }
    } else if (child && child._isReactElement) {
      const {_store} = child
      _store.originalProps = _store.props
      _store.props.parent = this
    }

    return child
  }
}


// Virtual node class represent a virtual version of an HTML element, it takes
// `type` (tagName of the node) hash a `properties` PropertyMap and array of
// children. Instances of `Node` implement interface of `React.createElement`
// and are used as such.
class Node extends Entity {
  constructor(type, properties, children) {
    super()
    this.type = type
    this.key = properties.key || properties.id
    this.children = children === NodeList.empty ? children :
                    typeof(children) === "string" ? children :
                    children.map(this.adopt, this)

    this.properties = properties


    var props = properties
    props.children = this.children
    props.parent = null

    this.props = props
    this.props.parent = null
    this._store = {originalProps: props, props}
    this._isReactElement = true
  }
  // Node class implements `clone` method so that non orphand instances
  // could be adopted by cloning.
  clone() {
    const {constructor, type, properties, children} = this
    console.warn(`cloned node`, this)
    return new constructor(type,
                           new PropertyMap(properties),
                           children)
  }
}

// EventTarget class instances represent virtual nodes that have an event handlers
// assigned. Event handlers are supposed to return an action that is dispatched
// on the node. Constructor is given a `type` of node (tagName), properties in form
// of `PropertyMap` and a `table` of event handers that are keyed by lower cased
// handler names like `onload`, `ondomcontentloaded` etc..
class EventTarget extends Node {
  constructor(type, properties, children, table) {
    super(type, properties, children);
    this.table = table;
    this.handleEvent = this.handleEvent.bind(this);
  }
  // handleEvent is invoked with an `event` once event on an actual dom node
  // that this represents occurs. Method looks up an associated handler in
  // the table and dispatches read action.
  handleEvent(event) {
    const capture = event.capture ? 'capture' : '';
    const type = event.type.toLowerCase();
    const read = this.table[`on${type}${capture}`];
    if (read) {
      dispatch(this, read(event));
    } else {
     console.warn(`Unexpected event occured`, this, event)
    }
  }
  // EventTarget class implements `clone` method so that non orphand instances
  // could be adopted by cloning.
  clone() {
    const {constructor, type, properties, children, table} = this
    console.warn(`cloned event target node`, this)
    return new constructor(type,
                          new PropertyMap(properties),
                          children,
                          table)
  }
}

// node function constructs a virtual dom nodes. It takes node `tagName`,
// optional `model` properties and optional `children` and produces instance
// of the appropriate virtual `Node`.
export let node = (tagName, model, children=NodeList.empty) => {
  let node = null
  let properties = new PropertyMap()

  if (model) {
    for (let name in model) {
      if (model.hasOwnProperty(name)) {
        const value = model[name]

        // Use `node.handleEvent` as handler for all handled events & store
        // actual handlers into a table so that `handleEvent` will be able to
        // read an action from an event using appropriate handler.
        if (typeof(value) === "function") {
          node = node || new EventTarget(tagName, properties, children, {})
          node.table[name.toLowerCase()] = value
          properties[name] = node.handleEvent
        } else if (name === "style" && value && value.toJSON) {
          properties[name] = value.toJSON()
        } else {
          properties[name] = value
        }
      }
    }
  }

  // If node is already present return it, otherwise it not a single event
  // handler was provided in which case we use simpler `Node` class to produce
  // an instance.
  return node || new Node(tagName, properties, children)
}


// Create a function for react supported nodes.
export let html = Object.create(null)
Object.keys(React.DOM).forEach(tagName => {
  html[tagName] = (model, children) => node(tagName, model, children)
})


// Fragment insntances represents a namespacing facility for
// entities in virtual dom tree, primarily to group several keyed
// nodes without wrapping them in an element. This allows different
// groups of nodes to be joined under the same parent. Namespacing
// such groups with a `properties.key` is crucial for optimising
// performance of virtual dom diffing algorithm. Optionally
// `properties.type` can be passed that will be a tagName of node
// if fragment is rendered as a root of dom tree, or root of the
// subtree that is computed lazily by a thunk. `children` argument
// is an array of nodes that this fragment represents.
class Fragment extends Entity {
  constructor(properties, children) {
    super()
    this.key = properties.key;
    this.type = properties.type || 'x:fragment';
    this.properties = properties;
    this.children = children.map(this.adopt, this);

    this.props = {parent: null, children}

    this._reactFragment = {[this.key]: this.children}
  }
  // Fragments can be cloned as other entities
  clone() {
    console.warn("clone fragment", this)
    return new this.constructor(this.properties, this.children)
  }
}

// Function for constructing fragments of virtual dom tree.
// Takes `properties.key` for identifying fragment, optional
// `properties.type` which is used as wrapper node for given
// `children` if fragment is returned from thunk or is rendered
// directly.
export let fragment = (properties, children) =>
  new Fragment(properties, children)

// Reframe class instances represent entities in the virtaul dom
// tree similar to fragments and their are intentded to reframe
// action disptched by it's children into a differet form.
class Reframe extends Fragment {
  constructor(translate, children) {
    super({key: '', type: 'x:reframe'}, children)
    this.translate = translate
  }
  clone() {
    console.warn("clone Reframe", this)
    return new this.constructor(this.translate, this.children)
  }
  receive(action) {
    dispatch(this.props.parent, this.translate(action));
  }
}


// Function for reframing entities, takes `translate` function for
// translating actions from framed entity to an action from outerframe.
export let reframe = (translate, entity) =>
  new Reframe(translate, [entity])

// View is a react component used by `Thunk` entities for a lazy
// sub tree generation and caching that can short cirquit when
// equivalent data is being rendered.
class View extends React.Component {
  constructor() {
    super(...arguments)
  }
  shouldComponentUpdate({view, model}) {
    return view !== this.props.view ||
           !model.equals(this.props.model);
  }
  render() {
    const {view, model, parent} = this.props
    const entity = view(model)
    const node = !(entity instanceof Fragment) ? entity :
                 new Node(entity.type, entity.properties, [entity])
    return parent.adopt(node)
  }
}

// Thunk instances are entities in a virtual dom tree that represent
// lazily computed sub-trees with built-in caching that avoid re-computing
// sub-tree when same data is being rendered. Thunk implements same interface
// as `React.createElement(View, data)` to be compatible with reacts virtual
// dom but it also extends `Node` class so it could be `cloned` and `adopt`-ed
// as entities defined earlier.
class Thunk extends Entity {
  constructor(model, view) {
    super()
    this.type = View
    this.view = view
    this.model = model
    this.key = model.key || model.id

    var props = this
    this.props = props
    this._store = {props, originalProps:props}
    this._isReactElement = true
  }
  clone() {
    const {model, view} = this
    return new this.constructor(view, model)
  }
}

// render function provides shortcut for rendering a model with
// default view function (although custom view function can be
// passed as second optional argument), but unlike calling view
// directly result is a thunk, there for it's defers actual computation
// and makes use of caching to avoid computation when possible.
export let render = (model, view=model.constructor.view) =>
  new Thunk(model, view)

// Program is a root entity of the virtual dom tree that is responsible
// for computing a virtual dom tree for the `state` via given `view` function
// and reacting to dispatched actions via given `update` by updating a state
// and restarting a the same cycle again.
class Program extends Entity {
  constructor({target, state, update, view}) {
    super()
    this.target = target
    this.view = view
    this.update = update
    this.state = state
  }
  receive(action) {
    this.state = this.update(this.state, action)
    this.schedule()
  }
  schedule() {
    this.render()
    return this
  }
  render() {
    const node = this.adopt(render(this.state, this.view))
    React.render(node, this.target)
    return this
  }
}

// Function that takes `target` element to continiusly render given `model`
// into. model's default `update` function is used to update module in response
// to dispatched actions and model's default `view` function is used to compute
// dom tree represantation of the model. Optionally custom `update` and `view`
// functions could be passed to customize render loop.
export let main = (target, model, update=model.constructor.update, view=model.constructor.view) => {
  const program = new Program({
    state: model,
    target, update, view
  })
  program.schedule()
  return program
}
