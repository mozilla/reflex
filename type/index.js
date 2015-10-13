/* @flow */

export type Key = string
export type TagName = string
export type Text = string

export type TextNode = {
  $$typeof: "TextNode",
  text: string
};

export type VirtualNode = {
  $$typeof: "VirtualNode",
  key: ?Key,
  tagName: TagName,
  namespace: ?string,
  children: Array<ChildNode>
};

export type Arguments <params> = Array<any>
export type View <params> = (...args:Array<any>) => ChildNode

export type ThunkNode <Params> = {
  $$typeof: "ThunkNode",
  key: Key,
  view: View<Params>,
  args: Arguments<Params>
};

// Root node is a lazy (uncomputed & unrendered) representation of the
// application view that can be rendered with reflex renderer by calling
// `renderWith` method.
export type RootNode = {
  $$typeof: "RootNode",
  renderWith: (renderer:Renderer) => void
}

export type OrphanNode<Node> = {
  $$typeof: "OrphanNode",
  force: () => Node
}

export type ChildNode
  = VirtualNode
  | ThunkNode <any>
  | TextNode
  | Text


export type node = (tagName:TagName, properties:Object, children:?Array<ChildNode>) =>
  VirtualNode

export type text = (content:Text) => TextNode

export type thunk <params> = (key:Key, view:View<params>, ...args:Array<any>) =>
  ThunkNode<params>

export type render = (node:ChildNode) => void
export type Renderer = {node: node, text: text, thunk: thunk, render: render}
