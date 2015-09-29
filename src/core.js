/* @flow */

/*::
// We are using `Blank` type and it's instance as a reusable
// empty object.
type Blank = {}
type Empty = []
*/
const blank /*:Blank*/ = Object.freeze(Object.create(null))
const empty /*:Empty*/ = Object.freeze([])

/*::
// React 0.13 uses `_store` on element objects to store props
// and `originalProps` (so that it could spot mutations). As we
// try to avoid dependency on react we'll use `Store` type for
// for a `_store` feild to implement same interface.

type Store <Props> = {
  props: Props;
  originalProps: Props;
}

type Child = VirtualElement;
type Children = Array<Child>;

type NodeProps = {
  key: ?string;
  // Below it should really just be Child|Children but that seems to fail
  // see: https://github.com/facebook/flow/issues/815
  // As a workaround we inline all the types from the union in here.
  children: Children|string|ReactElement|VirtualNode|ThunkNode;
}
*/

// Recat@0.14 uses different API for elemnets, custom value for `$$typeof`
// field is used to signify that instance implement Element interface.
// See: https://github.com/facebook/react/blob/master/src/isomorphic/classic/element/ReactElement.js#L18-L22
const reactElementType = (typeof(Symbol) === 'function' && Symbol.for != null) ?
  Symbol.for('react.element') :
  0xeac7

// VirtualNode implements same interface as result of `React.createElement`
// but it's strictly for DOM elements. For thunks a.k.a components (in react
// vocabulary) we will have a different type.
export class VirtualNode {
  /*::
  // In >=react0.13 `key` field as an identifer of a child during diffing.
  key: ?string;
  // VirtualNode is exclusively represents virtual HTML nodes as thunks
  // a.k.a components (in react vocabulary) have their own type.
  type: string;

  // Interface of React@0.13 defines `_isReactElement` to signify that object
  // implement element interface.
  _isReactElement: boolean;
  _store: Store<NodeProps>;

  // In react@1.4
  $$typeof: symbol|number;
  props: NodeProps;

  // VirtualNode implements interface for several react versions, in order
  // to avoid extra allocations instance is also used as `_store` to support
  // 0.13 and there for we denfine `originalProps` to comply to the store
  // interface.
  originalProps: NodeProps;

  // Note _owner & ref fields are not used and there for ommited.
  */
  constructor(type/*:string*/, props/*:NodeProps*/, children/*:Children*/) {
    // React
    this.type = type
    this.key = props.key
    // Unbox single child otherwise react will wrap text nodes into
    // spans.
    props.children = children.length === 1 ? children[0] :
                     children;

    // React@0.14
    this.$$typeof = reactElementType
    this.props = props

    // React@0.13
    this._isReactElement = true
    // Use `this` as `_store` to avoid extra allocation. There for
    // we define additional `originalProps` to implement `_store` interface.
    // We don't actually worry about mutations as our API does not expose
    // props to user anyhow.
    this._store = this
    this.originalProps = props
  }
}

/*::
type ReactNode = ReactElement<any, any, any>;
export type VirtualElement = ReactNode|VirtualNode|ThunkNode|string;
export type View = (...args:Array<any>) => VirtualElement;
type ThunkProps = {
  key: string;
  view: View;
  args: Array<any>;
}
*/

export class ThunkNode {
  /*::
  key: string;
  type: NamedThunk;


  // react@1.4
  $$typeof: symbol|number;

  // React@10.3
  _isReactElement: boolean;
  _store: Store<ThunkProps>;


  props: ThunkProps;
  originalProps: ThunkProps;
  */
  constructor(key/*:string*/, NamedThunk/*:NamedThunk*/, view/*:View*/, args/*:Array<any>*/) {
    const props = {key, view, args}

    // React
    this.key = key
    this.type = NamedThunk

    // React@0.14
    this.$$typeof = reactElementType
    this.props = props

    // React@0.13
    this._isReactElement = true
    this.originalProps = props
    this._store = this
  }
}

const redirect = (addressBook, index) =>
  action => addressBook[index](action);

// Thunk implements React.Component interface although it's comprised of
// view function and arguments to bassed to it vs a subclassing and passing
// props. It represents subtree of the virtual dom that is computed lazily
// & since computation function and input is packed with this type it provides
// an opportunity to skip computation if two thunks are packagings of same
// view and args.
// Based on: https://github.com/facebook/react/blob/master/src/isomorphic/modern/class/ReactComponent.js
/*::
type ThunkState = {
  args: Array<any>;
  addressBook: Array<Function>;
};
type NamedThunk = SubClass<Thunk, *>;
*/
export class Thunk {
  /*::
  // Reflex keeps track of number of mounts as Thunk's are cached
  // by a displayName.
  static mounts: number;
  // Reflex stores currently operating `view` function into `Thunk.context`
  // in order to allow memoization functions to be contextual.
  static context: ?View;

  // React devtools presents information based on `displayName`
  static displayName: string;

  // React component
  props: ThunkProps;
  state: ThunkState;

  context: any;
  refs: any;
  updater: any;
  */
  constructor(props/*:ThunkProps*/, context/*:any*/, updater/*:any*/) {
    this.props = props
    this.context = context
    this.refs = blank
    this.updater = updater

    this.state = {addressBook: [], args: []}
  }
  static withDisplayName(displayName/*:string*/) {
    class NamedThunk extends Thunk {
      /*::
      static mounts: number;
      */
    }
    NamedThunk.displayName = displayName
    NamedThunk.mounts = 0
    return NamedThunk
  }
  componentWillMount() {
    // Increase number of mounts for this Thunk type.
    ++this.constructor.mounts

    const {addressBook, args} = this.state
    const {args: input} = this.props
    const count = input.length

    let index = 0
    while (index < count) {
     const arg = input[index]
     if (typeof(arg) === 'function') {
       addressBook[index] = arg
       args[index] = redirect(addressBook, index)
     } else {
       args[index] = arg
     }
     index = index + 1
    }
  }
  shouldComponentUpdate(props/*:ThunkProps*/, _/*:ThunkState*/)/*:boolean*/{
    const {key, view, args: passed} = props

    if (profile) {
      console.time(`${key}.receive`)
    }

    const {args, addressBook} = this.state

    const count = passed.length
    let index = 0
    let isUpdated = this.props.view !== view;

    if (args.length !== count) {
      isUpdated = true
      args.length = count
      addressBook.length = count
    }

    while (index < count) {
      const next = passed[index]
      const arg = args[index]

      if (next !== arg) {
        const isNextAddress = typeof(next) === 'function'
        const isCurrentAddress = typeof(arg) === 'function'

        if (isNextAddress && isCurrentAddress) {
          // Update adrress book with a new address.
          addressBook[index] = next
        } else {
          isUpdated = true

          if (isNextAddress) {
            addressBook[index] = next
            args[index] = redirect(addressBook, index)
          } else {
            args[index] = next
          }
        }
        index = index + 1
      }
    }

    if (profile) {
      console.timeEnd(`${key}.receive`)
    }

    return isUpdated
  }
  render()/*:VirtualElement*/ {
    if (profile) {
      console.time(`${this.props.key}.render`)
    }

    const {args} = this.state
    const {view, key} = this.props

    // Store current context and change current context to view.
    const context = Thunk.context
    Thunk.context = view

    const tree = view(...args)

    // Restore previosu context.
    Thunk.context = context

    if (profile) {
      console.timeEnd(`${key}.render`)
    }

    return tree
  }
  componentWillUnmount() {
    // Decrement number of mounts for this Thunk type if no more mounts left
    // remove it from the cache map.
    if (--this.constructor.mounts === 0) {
      delete thunkCacheTable[this.constructor.displayName];
    }
  }

}

// Following symbol is used for cacheing Thunks by an associated displayName
// under `React.Component[thunks]` namespace. This way we workaround reacts
// remounting behavior if element type does not match (see facebook/react#4826).
export const thunks = (typeof(Symbol) === "function" && Symbol.for != null) ?
  Symbol.for("reflex/thunk/0.1") :
  "reflex/thunk/0.1";

// Alias cache table locally or create new table under designated namespace
// and then alias it.
/*::
type ThunkTable = {[key: string]: NamedThunk};
*/
const thunkCacheTable /*:ThunkTable*/ = global[thunks] != null ? global[thunks] :
                                        (global[thunks] = Object.create(null));

export const thunk = (key/*:string*/, view/*:View*/, ...args/*:Array<any>*/)/*:ThunkNode*/ => {
  const name = key.split("@")[0];
  const type = thunkCacheTable[name] != null ? thunkCacheTable[name] :
               (thunkCacheTable[name] = Thunk.withDisplayName(name));

  return new ThunkNode(key, type, view, args);
};

export const node = (tagName/*:string*/, properties/*:NodeProps*/, children/*:?Children*/)/*:VirtualNode*/ =>
  new VirtualNode(tagName, properties, children == null ? empty : children)

/*::
type HTMLNode = (properties:NodeProps, children:?Children) => VirtualNode
type HTMLTable = {[key:string]: HTMLNode}
*/
export const html/*:HTMLTable*/ = Object.create(null);

["a","abbr","address","area","article","aside","audio","b","base","bdi",
 "bdo","big","blockquote","body","br","button","canvas","caption","cite",
 "code","col","colgroup","data","datalist","dd","del","details","dfn",
 "dialog","div","dl","dt","em","embed","fieldset","figcaption","figure",
 "footer","form","h1","h2","h3","h4","h5","h6","head","header","hr","html",
 "i","iframe","img","input","ins","kbd","keygen","label","legend","li","link",
 "main","map","mark","menu","menuitem","meta","meter","nav","noscript",
 "object","ol","optgroup","option","output","p","param","picture","pre",
 "progress","q","rp","rt","ruby","s","samp","script","section","select",
 "small","source","span","strong","style","sub","summary","sup","table",
 "tbody","td","textarea","tfoot","th","thead","time","title","tr","track",
 "u","ul","var","video","wbr","circle","clipPath","defs","ellipse","g","line",
 "linearGradient","mask","path","pattern","polygon","polyline","radialGradient",
 "rect","stop","svg","text","tspan"].forEach((tagName/*:string*/) => {
    html[tagName] = (properties/*:NodeProps*/, children/*:?Children*/)/*:VirtualNode*/=>
      new VirtualNode(tagName, properties, children == null ? empty : children);
});

let profile/*:?string*/ = null
export const time = (name/*:?string*/='')/*:void*/ => {
  profile = `${name} `
}

export const timeEnd = ()/*:void*/ => {
  profile = null
}
