/* @flow */

import {
  LazyTree,
  VirtualRoot,
  Driver,
  VirtualText,
  VirtualNode,
  Thunk,
  Widget
} from "./driver"

import type { Address, VirtualTree, PropertyDictionary } from "./driver"
export type DOM = VirtualTree

export type RootView<model, action> = (
  model: model,
  address: Address<action>
) => VirtualTree

let driver: ?Driver = null
const absent = new String("absent")

class Root<state, action> implements VirtualRoot {
  constructor(
    view: (model: state, address: Address<action>) => DOM,
    model: state,
    address: Address<action>
  ) {
    this.view = view
    this.model = model
    this.address = address
  }
  renderWith(current: Driver): DOM {
    const previous = driver
    driver = current

    try {
      const tree: DOM = this.view(this.model, this.address)
      driver = previous
      return tree
    } catch (error) {
      driver = previous
      throw error
    }
  }

  $type: "VirtualRoot" = "VirtualRoot"
  view: (model: state, address: Address<action>) => DOM
  model: state
  address: Address<action>
}

export class LazyNode implements LazyTree<VirtualNode> {
  constructor(
    tagName: string,
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

  $type: "LazyTree" = "LazyTree"

  tagName: string
  properties: ?PropertyDictionary
  children: ?Array<DOM>
  key: ?string
  namespace: string
}

class LazyThunk implements LazyTree<Thunk> {
  constructor(key: string, view: Function, ...args: Array<any>) {
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

  $type: "LazyTree" = "LazyTree"

  key: string
  view: Function
  args: Array<any>
}

export const root = <state, action>(
  view: (model: state, address: Address<action>) => DOM,
  model: state,
  address: Address<action>
): VirtualRoot => new Root(view, model, address)

export const text = (content: string): VirtualText =>
  driver == null ? (content: any) : driver.text(content)

export const node = (
  tagName: string,
  properties: ?PropertyDictionary,
  children: ?Array<DOM>
): VirtualNode | LazyTree<VirtualNode> =>
  driver == null
    ? new LazyNode(tagName, properties, children)
    : driver.node(tagName, properties, children)

export const thunk = <a, b, c, d, e, f, g, h, i, j>(
  key: string,
  view: (a: a, b: b, c: c, d: d, e: e, f: f, g: g, h: h, i: i, j: j) => DOM,
  a0: a,
  a1: b,
  a2: c,
  a3: d,
  a4: e,
  a5: f,
  a6: g,
  a7: h,
  a8: i,
  a9: j
): Thunk | LazyTree<Thunk> =>
  driver == null
    ? new LazyThunk(key, view, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9)
    : driver.thunk(key, view, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9)
