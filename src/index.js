import * as React from "react"

if (typeof(Symbol) === 'undefined') {
  var Symbol = name => `@@${name}#${Math.random().toString(36).substr(2)}`
  Symbol.for = name => `@@${name}`
}


if (typeof(WeakMap) === 'undefined') {
  let weakMapID = 0;
  var WeakMap = class {
    constructor() {
      this.id = `weak#${(++weakMapID).toString(36)}`
    }
    has(key) {
      return this.hasOwnProperty.call(key, this.id);
    }
    set(key, value) {
      key[this.id] = value
    }
    get(key) {
      return key[this.id]
    }
    delete(key) {
      delete key[this.id]
    }
    clear() {
      this.constructor()
      console.warn('WeakMap polyfill does not release references')
    }
  }
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
  static for(view, key) {
    class ReactComponent extends Thunk {
      constructor(props, context) {
        super(props, context)
        this.view = view
      }
    }
    ReactComponent.displayName = key.split('@')[0];
    return ReactComponent
  }
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
    if (profile) {
      console.time(`${this.props.Key}@compute`)
    }

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
      // Turns out equality checks add enough overhead that it has a negative
      // effect on overal performance.
      //} else if (next && next.equals && next.equals(arg)) {
      //  args[index] = next
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

    if (profile) {
      console.timeEnd(`${this.props.Key}@compute`)
    }
  }
  shouldComponentUpdate(_, state) {
    return state !== this.state
  }
  render() {
    // Store currently operating view to enable cacheing by
    // the view.
    Thunk.context = this.view

    if (profile) {
      console.time(`${this.props.Key}@render`)
    }

    const {args} = this.state
    const result = this.view(...args)

    if (profile) {
      console.timeEnd(`${this.props.Key}@render`)
    }

    Thunk.context = null
    return result;
  }
}

const contextualCache = new WeakMap()
const contextlessCache = new WeakMap()

export const cache = (f, ...args) => {
  let cache = null
  let changed = false
  const context = Thunk.context


  if (context) {
    cache = contextualCache.get(f)
    if (!cache) {
      contextualCache.set(f, cache = new WeakMap())
    }
  } else {
    cache = contextlessCache
  }

  let memory = cache.get(f)
  if (memory) {
    const {input} = memory

    const count = input.length
    let index = 0
    let changed = args.length !== count
    while (!changed && index < count && !changed) {
      const past = input[index]
      const current = args[index]

      changed = current !== past
      index = index + 1
    }

    if (changed) {
      memory.output = f(...args)
      memory.input = args
    }
  } else {
    memory = {output: f(...args), input: args}
    cache.set(f, memory)
  }

  return memory.output
}

// render function provides shortcut for rendering a model with
// default view function (although custom view function can be
// passed as second optional argument), but unlike calling view
// directly result is a thunk, there for it's defers actual computation
// and makes use of caching to avoid computation when possible.
export const render = (key, view, ...args) => {
  const component = view.reactComponent ||
                    (view.reactComponent = Thunk.for(view, key));
  return React.createElement(component, {key, Key: key, args});
}

let GUID = 0
export class Address {
  constructor(mailbox, forwarders) {
    this.id = ++GUID
    this.mailbox = mailbox
    this.forwarders = forwarders
  }
  direct(forward) {
    const cache = forward[Address.cache] ||
                  (forward[Address.cache] = {})

    if (!cache[this.id]) {
      const forwarders = this.forwarders ? [forward].concat(this.forwarders) :
                         [forward]
      cache[this.id] = new Address(this.mailbox, forwarders)
    }

    return cache[this.id]
  }
  receive(action) {
    if (this.isBlocked && action !== null) {
      (this.queue || (this.queue = [])).push(action)
    } else {
      const {forwarders} = this
      this.isBlocked = true
      let ticket = -1

      // Define a `delivered` flag that is updated at the begining of action
      // delivery and at the end of it. This is so that in finally we can
      // figure out if exception was throw or not.
      let delivered = false

      while (this.isBlocked) {
        try {
          delivered = false

          if (action !== null) {
            if (forwarders) {
              const count = forwarders.length
              let index = 0
              while (index < count) {
                action = forwarders[index](action)
                index = index + 1
              }
            }

            this.mailbox.receive(action)

            delivered = true
          }
        } finally {
          ticket = ticket + 1
          this.isBlocked = this.queue && this.queue.length > ticket
          action = this.isBlocked && this.queue[ticket]

          // If failed to deliver (exception was thrown) and address is still
          // blocked that means there are still pending actions to process. In
          // that case we unblock an address remove delivered actions from a
          // queue and re-enter receive loop. This way receive drains action
          // action loop regardless of exceptions that may occur.
          if (!delivered && this.isBlocked) {
            this.isBlocked = false
            this.queue && this.queue.splice(0, ticket + 1)
            this.receive(action)
          }
        }
      }

      this.queue && this.queue.splice(0)
    }
  }
  send(action) {
    return _ => this.receive(action)
  }
  pass(read, ...prefix) {
    if (typeof(read) !== 'function') {
      throw TypeError('Non function was passed to address.pass');
    }

    return event => this.receive(read(...prefix, event))
  }
}
Address.cache = Symbol.for('reflex/address-book')

// Program is a root entity of the virtual dom tree that is responsible
// for computing a virtual dom tree for the `state` via given `view` function
// and reacting to dispatched actions via given `update` by updating a state
// and restarting a the same cycle again.
export class Application {
  constructor({address, target, state, update, view}) {
    this.target = target
    this.view = view
    this.update = update
    this.state = state
    this.address = address
    this.render = this.render.bind(this)
  }
  receive(action) {
    this.action = action
    this.state = this.update(this.state, this.action)
    this.schedule()
  }
  schedule() {
    if (!this.isScheduled) {
      //this.isScheduled = true
      //this.version = requestAnimationFrame(this.render)
      this.render()
    }
  }
  render() {
    if (profile) {
      console.time('React.render')
    }

    const start = performance.now()
    this.tree = render('Application', this.view, this.state, this.address)
    React.render(this.tree, this.target)
    this.isScheduled = false
    const end = performance.now()
    const time = end - start

    if (time > 16) {
      console.warn(`Render took ${time}ms & will cause frame drop`)
    }

    if (profile) {
      console.timeEnd('React.render')
    }
    return this
  }
}

// Function that takes `target` element to continiusly render given `model`
// into. model's default `update` function is used to update module in response
// to dispatched actions and model's default `view` function is used to compute
// dom tree represantation of the model. Optionally custom `update` and `view`
// functions could be passed to customize render loop.
export let main = (target, model, update=model.constructor.update, view=model.constructor.view) => {
  const application = new Application({
    state: model,
    target, update, view
  })
  application.address = new Address(application);

  application.schedule()
  return application
}

let profile = null
export const time = (name='') =>
  profile = `${name} `
export const timeEnd = () =>
  profile = null
