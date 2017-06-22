/* @flow */

export type Address<message> = (msg: message) => void

export type Key = string
export type TagName = string
export type Text = string

export type AttributeDictionary = {
  [key: string]: string | number | boolean
}

export type StyleDictionary = {
  [key: string]: string | number | boolean
}

export type PropertyDictionary = {
  attributes?: AttributeDictionary,
  style?: StyleDictionary,
  value?: any,
  key?: string,
  [key: string]: any
}

export type VirtualText = {
  $type: "VirtualText",
  text: string
}

export type VirtualNode = {
  $type: "VirtualNode",
  key: ?Key,
  tagName: TagName,
  namespace: ?string,
  children: Array<VirtualTree>
}

export type Thunk = {
  $type: "Thunk",
  key: Key
}

export type Widget = {
  $type: "Widget",
  initialize: () => Element,
  update: (previous: Widget, node: Element) => ?Element,
  destroy: (node: Element) => void
}

export type LazyTree<Tree> = {
  $type: "LazyTree",
  force: () => Tree
}

export type VirtualTree =
  | Text
  | VirtualText
  | VirtualNode
  | Thunk
  | Widget
  | LazyTree<VirtualNode>
  | LazyTree<Thunk>

export type DOM = VirtualTree

// Root node is a lazy (uncomputed & unrendered) representation of the
// application view that can be rendered with reflex renderer by calling
// `renderWith` method.
export interface VirtualRoot {
  $type: "VirtualRoot",
  renderWith(driver: Driver): void
}

export type render = (tree: VirtualTree) => void

export type text = (content: string) => VirtualText

export type node = (
  tagName: TagName,
  properties: ?PropertyDictionary,
  children: ?Array<VirtualTree>
) => VirtualNode

export type thunk = <a, b, c, d, e, f, g, h, i, j>(
  key: string,
  view: (
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
  ) => VirtualTree,
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
) => Thunk

export interface Driver {
  node: node,
  text: ?text,
  thunk<a, b, c, d, e, f, g, h, i, j>(
    key: string,
    view: (
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
    ) => VirtualTree,
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
  ): Thunk,
  address: Address<VirtualRoot>,

  render: render
}
