/* @flow */

export type Address<message> = (msg: message) => void

export type AttributeDictionary = {
  [string]: null | string | number | boolean
}

export type StyleDictionary = {
  [string]: null | string | number | boolean
}

export type PropertyDictionary = {
  attributes?: AttributeDictionary,
  style?: StyleDictionary,
  key?: string,
  value?: mixed,
  [string]: mixed
}

export interface VirtualText {
  $type: "VirtualText",
  text: string
}

export interface VirtualNode {
  $type: "VirtualNode",
  key: ?string,
  tagName: string,
  namespace: ?string,
  children: Array<VirtualTree>
}

export interface Thunk {
  $type: "Thunk",
  key: string
}

export interface Widget {
  $type: "Widget",
  initialize(): Element,
  update(previous: Widget, node: Element): ?Element,
  destroy(node: Element): void
}

export interface LazyTree<Tree> {
  $type: "LazyTree",
  force(): Tree
}

export type VirtualTree = string | VirtualText | VirtualNode | Thunk | Widget

export type DOM = VirtualTree

// Root node is a lazy (uncomputed & unrendered) representation of the
// application view that can be rendered with reflex renderer by calling
// `renderWith` method.
export interface VirtualRoot {
  $type: "VirtualRoot",
  renderWith(driver: Driver): DOM
}

export type text = (content: string) => VirtualText

export type node = (
  tagName: string,
  properties: ?PropertyDictionary,
  children: ?Array<VirtualTree>
) => VirtualNode

export type thunk = <a, b, c, d, e, f, g, h, i, j>(
  key: string,
  view: (
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
  ) => VirtualTree,
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
) => Thunk

export interface Driver {
  text: text,
  node: node,
  thunk: thunk,
  render(root: VirtualRoot): void
}
