/* @flow */

import type {
  Address,
  Key,
  Text,
  TagName,
  PropertyDictionary,
  LazyTree,
  VirtualTree,
  VirtualRoot,
  Driver,
  VirtualText,
  VirtualNode,
  Thunk,
  Widget
} from "./driver"
export type DOM = VirtualTree

export type RootView<model, action> = (
  model: model,
  address: Address<action>
) => VirtualTree

let driver: ?Driver = null
const absent = new String("absent")

class Root<model, action> {
  constructor(
    view: (model: model, address: Address<action>) => DOM,
    model: model,
    address: Address<action>
  ) {
    this.view = view
    this.model = model
    this.address = address
  }
  renderWith(current: Driver) {
    let exception: Error | String = absent
    const previous = driver
    driver = current

    try {
      driver.render(this.view(this.model, this.address))
    } catch (error) {
      exception = error
    }

    driver = previous

    if (exception != absent) {
      throw exception
    }
  }

  $type: "VirtualRoot"
  view: (model: model, address: Address<action>) => DOM
  model: model
  address: Address<action>
}
Root.prototype.$type = "VirtualRoot"

export class LazyNode {
  constructor(
    tagName: TagName,
    properties: ?PropertyDictionary,
    children: ?Array<DOM>
  ) {
    this.tagName = tagName
    this.properties = properties
    this.children = children
    this.key = properties == null ? null : properties.key
  }
  force(): VirtualNode {
    if (driver == null) {
      throw TypeError(
        "LazyTree may only be forced from with in the Root.renderWith(driver) call"
      )
    }

    return driver.node(this.tagName, this.properties, this.children)
  }

  $type: "LazyTree"

  tagName: TagName
  properties: ?PropertyDictionary
  children: ?Array<DOM>
  key: ?Key
  namespace: string
}
LazyNode.prototype.$type = "LazyTree"

class LazyThunk {
  constructor(key: Key, view: Function, ...args: Array<any>) {
    this.key = key
    this.view = view
    this.args = args
  }
  force(): Thunk {
    if (driver == null) {
      throw TypeError(
        "LazyTree may only be forced from with in the Root.renderWith(driver) call"
      )
    }

    return driver.thunk(this.key, this.view, ...this.args)
  }

  $type: "LazyTree"

  key: Key
  view: Function
  args: Array<any>
}
LazyThunk.prototype.$type = "LazyTree"

export const root = <model, action>(
  view: (model: model, address: Address<action>) => DOM,
  model: model,
  address: Address<action>
): VirtualRoot => new Root(view, model, address)

export const text = (content: Text): Text | VirtualText =>
  driver == null
    ? content
    : driver.text == null ? content : driver.text(content)

export const node = (
  tagName: TagName,
  properties: ?PropertyDictionary,
  children: ?Array<DOM>
): VirtualNode | LazyTree<VirtualNode> =>
  driver == null
    ? new LazyNode(tagName, properties, children)
    : driver.node(tagName, properties, children)

export const thunk = <a, b, c, d, e, f, g, h, i, j>(
  key: string,
  view: (a: a, b: b, c: c, d: d, e: e, f: f, g: g, h: h, i: i, j: j) => DOM,
  a: a,
  b: b,
  c: c,
  d: d,
  e: e,
  f: f,
  g: g,
  h: h,
  i: i,
  j: j
): Thunk | LazyTree<Thunk> =>
  driver == null
    ? new LazyThunk(key, view, a, b, c, d, e, f, g, h, i, j)
    : driver.thunk(key, view, a, b, c, d, e, f, g, h, i, j)
