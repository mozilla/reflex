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

let driver: Driver = {
  node: (..._): VirtualNode => {
    throw new Error("You need to use reflex driver in order to create nodes")
  },
  text: (..._): VirtualText => {
    throw new Error("You need to use reflex driver in order to create nodes")
  },
  thunk: <a, b, c, d, e, f, g, h, i, j>(
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
  ): Thunk => {
    throw new Error("You need to use reflex driver in order to create nodes")
  },
  render: (root: VirtualRoot) => {
    throw new Error("You need to use reflex driver in order to create nodes")
  }
}

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
    driver = current
    return this.view(this.model, this.address)
  }

  $type: "VirtualRoot" = "VirtualRoot"
  view: (model: state, address: Address<action>) => DOM
  model: state
  address: Address<action>
}

export const root = <state, action>(
  view: (model: state, address: Address<action>) => DOM,
  model: state,
  address: Address<action>
): VirtualRoot => new Root(view, model, address)

export const text = (content: string): VirtualText => driver.text(content)

export const node = (
  tagName: string,
  properties: ?PropertyDictionary,
  children: ?Array<DOM>
): VirtualNode => driver.node(tagName, properties, children)

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
): Thunk => driver.thunk(key, view, a0, a1, a2, a3, a4, a5, a6, a7, a8, a9)
