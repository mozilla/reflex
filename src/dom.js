/* @flow */

/*::
import type {Text, Key, TagName, PropertyDictionary} from "./core"
import type {VirtualText, VirtualNode, DOM, LazyTree, Thunk} from "./core"
import type {Driver} from "./driver"
import type {Address} from "./signal"

export type {Text, Key, TagName, DOM}
*/

let driver/*:?Driver*/ = null
const absent = new String("absent")

class VirtualRoot /*::<model, action>*/ {
  /*::
  $type: "VirtualRoot";

  view: (model:model, address:Address<action>) => DOM;
  model: model;
  address: Address<action>;
  */
  constructor(
    view/*:(model:model, address:Address<action>) => DOM*/
  , model/*:model*/
  , address/*:Address<action>*/
  ) {
    this.view = view
    this.model = model
    this.address = address
  }
  renderWith(current/*:Driver*/) {
    let exception = absent
    const previous = driver
    driver = current

    try {
      driver.render(this.view(this.model, this.address))
    }
    catch(error) {
      exception = error
    }

    driver = previous

    if (exception != absent) {
      throw exception
    }
  }
}
VirtualRoot.prototype.$type = "VirtualRoot"

export class LazyNode {
  /*::
  $type: "LazyTree";

  tagName: TagName;
  properties: ?PropertyDictionary;
  children: ?Array<DOM>;
  key: ?Key;
  namespace: string;
  */
  constructor(tagName/*:TagName*/, properties/*:?PropertyDictionary*/, children/*:?Array<DOM>*/) {
    this.tagName = tagName
    this.properties = properties
    this.children = children
    this.key = properties == null ? null : properties.key
  }
  force()/*:VirtualNode*/ {
    if (driver == null) {
      throw TypeError('LazyTree may only be forced from with in the Root.renderWith(driver) call')
    }

    return driver.node(this.tagName, this.properties, this.children)
  }
}
LazyNode.prototype.$type = "LazyTree";

class LazyThunk {
  /*::
  $type: "LazyTree";

  key: Key;
  view: Function;
  args: Array<any>;
  */
  constructor(key/*:Key*/, view/*:Function*/, args/*:Array<any>*/) {
    this.key = key
    this.view = view
    this.args = args
  }
  force()/*:Thunk*/ {
    if (driver == null) {
      throw TypeError('LazyTree may only be forced from with in the Root.renderWith(driver) call')
    }

    return driver.thunk(this.key, this.view, ...this.args)
  }
}
LazyThunk.prototype.$type = "LazyTree";

export const root = /*::<model, action>*/
  ( view/*:(model:model, address:Address<action>) => DOM*/
  , model/*:model*/
  , address/*:Address<action>*/
  )/*:VirtualRoot<model, action>*/ =>
  new VirtualRoot
  ( view
  , model
  , address
  )

export const text =
  (content/*:Text*/)/*:Text | VirtualText*/ =>
  ( driver == null
  ? content
  : driver.text == null
  ? content
  : driver.text(content)
  )

export const node =
  ( tagName/*:TagName*/
  , properties/*:?PropertyDictionary*/
  , children/*:?Array<DOM>*/
  )/*:VirtualNode | LazyTree<VirtualNode>*/ =>
  ( driver == null
  ? new LazyNode(tagName, properties, children)
  : driver.node(tagName, properties, children)
  )

export const thunk = /*::<a, b, c, d, e, f, g, h, i, j>*/
  ( key/*:string*/
  , view/*:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j) => DOM*/
  , ...args/*:Array<any>*/
  )/*:Thunk | LazyTree<Thunk>*/ =>
  ( driver == null
  ? new LazyThunk(key, view, args)
  : driver.thunk(key, view, ...args)
  )
