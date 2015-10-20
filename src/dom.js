/* @flow */

/*::
import * as type from "../type/dom"
import type {Driver} from "../type/driver"
import type {Address} from "../type/signal"
*/

let driver/*:?Driver*/ = null

export class VirtualRoot /*::<model, action>*/ {
  /*::
  $type: "VirtualRoot";

  view: type.View<[model, action]>;
  model: model;
  address: Address<action>;
  */
  constructor(view/*:type.View<[model, action]>*/, model/*:model*/, address/*:Address<action>*/) {
    this.view = view
    this.model = model
    this.address = address
  }
  renderWith(current/*:Driver*/) {
    const previous = driver
    driver = current

    try {
      driver.render(this.view(this.model, this.address))
    } finally {
      driver = previous
    }
  }
}
VirtualRoot.prototype.$type = "VirtualRoot"


export class LazyNode {
  /*::
  $type: "LazyTree";

  tagName: type.TagName;
  properties: ?type.PropertyDictionary;
  children: ?Array<type.VirtualTree>;
  key: ?type.Key;
  namespace: string;
  */
  constructor(tagName/*:type.TagName*/, properties/*:?type.PropertyDictionary*/, children/*:?Array<type.VirtualTree>*/) {
    this.tagName = tagName
    this.properties = properties
    this.children = children
    this.key = properties == null ? null : properties.key
  }
  force()/*:type.VirtualNode*/ {
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

  key: type.Key;
  view: Function;
  args: Array<any>;
  */
  constructor(key/*:type.Key*/, view/*:Function*/, args/*:Array<any>*/) {
    this.key = key
    this.view = view
    this.args = args
  }
  force()/*:type.Thunk*/ {
    if (driver == null) {
      throw TypeError('LazyTree may only be forced from with in the Root.renderWith(driver) call')
    }

    return driver.thunk(this.key, this.view, ...this.args)
  }
}
LazyThunk.prototype.$type = "LazyTree";

export const text/*:type.text*/ = content =>
  driver == null ? content :
  driver.text == null ? content :
  driver.text(content)

export const node/*:type.node*/ = (tagName, properties, children) =>
  driver == null ? new LazyNode(tagName, properties, children) :
  driver.node(tagName, properties, children)

export const thunk/*:type.thunk*/ = (key, view, ...args) =>
  driver == null ? new LazyThunk(key, view, args) :
  driver.thunk(key, view, ...args)
