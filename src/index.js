import * as React from "react"

if (typeof(Symbol) === 'undefined') {
  var Symbol = name => `@@${name}#${Math.random().toString(36).substr(2)}`
  Symbol.for = name => `@@${name}`
}


// node function constructs a virtual dom nodes. It takes node `tagName`,
// optional `model` properties and optional `children` and produces instance
// of the appropriate virtual `Node`.
export let node = (tagName, model, children=NodeList.empty) => {
  let properties = {}

  if (model) {
    for (let name in model) {
      if (model.hasOwnProperty(name)) {
        const value = model[name]
        if (name === "style" && value && value.toJSON) {
          properties[name] = value.toJSON()
        } else {
          properties[name] = value
        }
      }
    }
  }

  properties.children = children

  return React.createElement(tagName, properties)
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
class Fragment {
  constructor(properties, children) {
    this.key = properties.key;
    this.type = properties.type || 'x:fragment';
    this.properties = properties;
    this.children = children;

    this._reactFragment = {[this.key]: this.children}
  }
}

// Function for constructing fragments of virtual dom tree.
// Takes `properties.key` for identifying fragment, optional
// `properties.type` which is used as wrapper node for given
// `children` if fragment is returned from thunk or is rendered
// directly.
export let fragment = (properties, children) =>
  new Fragment(properties, children)


const redirect = to => action => ({to, action});


// Thunk instances are entities in a virtual dom tree that represent
// lazily compute sub-trees with built-in caching that avoid re-computing
// sub-tree when same data is being rendered.
class Thunk extends React.Component {
  constructor(props, context) {
    super(props, context)
  }
  receive({to, action}) {
    this.state.addressBook[to].receive(action)
  }
  componentWillMount() {
    const {args} = this.props
    const count = args.length

    const addressBook = new Array(count)
    const params = new Array(count)

    let index = 0
    while (index < count) {
      const arg = args[index]
      if (arg instanceof Address) {
        addressBook[index] = arg
        params[index] = new Address(this, [redirect(index)])
      } else {
        params[index] = arg
      }
      index = index + 1
    }

    this.setState({args: params, addressBook})
  }
  componentWillReceiveProps({args: after}) {
    const {args, addressBook} = this.state

    const count = after.length
    let index = 0
    let isUpdated = false

    if (args.length !== count) {
      isUpdated = true
      args.length = count
      addressBook.length = count
    }

    while (index < count) {
      const next = after[index]
      const arg = args[index]

      if (next === arg) {
        // do nothing
      } else if (next && next.isEqual && next.isEqual(arg)) {
        args[index] = next
      } else if (next instanceof Address && arg instanceof Address) {
        // Update adrress book with a new address.
        addressBook[index] = next
      } else {
        isUpdated = true

        if (next instanceof Address) {
          addressBook[index] = next
          args[index] = new Address(this, [redirect(index)])
        } else {
          args[index] = next
        }
      }
      index = index + 1
    }

    if (isUpdated) {
      this.setState({args, addressBook})
    }
  }
  shouldComponentUpdate(_, state) {
    return state !== this.state
  }
  render() {
    const {args: [view, ...params]} = this.state
    return view(...params)
  }
}


// render function provides shortcut for rendering a model with
// default view function (although custom view function can be
// passed as second optional argument), but unlike calling view
// directly result is a thunk, there for it's defers actual computation
// and makes use of caching to avoid computation when possible.
export const render = (key, ...args) =>
  React.createElement(Thunk, {key, args});

let GUID = 0
class Address {
  constructor(mailbox, forwarders) {
    this.id = ++GUID
    this.mailbox = mailbox
    this.forwarders = forwarders
  }
  direct(forward) {
    const cache = forward[Address.cache] ||
                  (forward[Address.cache] = {})

    if (cache[this.id]) {
      const forwarders = this.forwarders ? [forward].concat(this.forwarders) :
                         [forward]
      cache[this.id] = new Address(this.mailbox, forwarders)
    }

    return cache[this.id]
  }
  receive(action) {
    const {forwarders} = this
    if (forwarders) {
      const count = forwarders.length
      let index = 0
      while (index < count) {
        action = forwarders[index](action)
        index = index + 1
      }
    }

    return this.mailbox.receive(action)
  }
  send(action) {
    return _ => this.receive(action)
  }
  pass(read, ...prefix) {
    return event => this.receive(read(...prefix, event))
  }
}
Address.cache = Symbol.for('reflex/address-book')

// Program is a root entity of the virtual dom tree that is responsible
// for computing a virtual dom tree for the `state` via given `view` function
// and reacting to dispatched actions via given `update` by updating a state
// and restarting a the same cycle again.
class Program {
  constructor({target, state, update, view}) {
    this.target = target
    this.view = view
    this.update = update
    this.state = state
    this.address = new Address(this)
  }
  receive(action) {
    this.action = action
    this.state = this.update(this.state, this.action)
    this.schedule()
  }
  schedule() {
    this.render()
    return this
  }
  render() {
    this.tree = render('program', this.view, this.state, this.address)
    React.render(this.tree, this.target)
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
