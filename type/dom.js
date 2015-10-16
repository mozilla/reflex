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

export type ThunkNode = {
  $$typeof: "ThunkNode",
  key: Key,
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
  | ThunkNode
  | TextNode
  | Text
  | OrphanNode <TextNode>
  | OrphanNode <VirtualNode>
  | OrphanNode <ThunkNode>

export type VirtualDOM = ChildNode

export type AttributeDictionary = {
  [key:string]: string|number|boolean
}

export type StyleDictionary = {
  [key:string]: string|number|boolean
}

export type PropertyDictionary = {
  attributes?: AttributeDictionary,
  style?: StyleDictionary,
  [key:string]: any
}


export type node = (tagName:TagName, properties:?PropertyDictionary, children:?Array<ChildNode>) =>
  VirtualNode
export type text = (content:Text) => TextNode
export type render = (node:ChildNode) => void


const thunk$0 = (key:string, view:(..._:any) => ChildNode):ThunkNode =>
  thunk$$(key, view)

const thunk$1 = <a> (key:string, view:(a:a, ..._:any) => ChildNode, a:a):ThunkNode =>
  thunk$$(key, view, a)

const thunk$2 = <a, b> (key:string,
                        view:(a:a, b:b, ..._:any) => ChildNode,
                        a:a, b:b):ThunkNode =>
  thunk$$(key, view, a, b)

const thunk$3 = <a, b, c> (key:string,
                           view:(a:a, b:b, c:c, ..._:any) => ChildNode,
                           a:a, b:b, c:c):ThunkNode =>
  thunk$$(key, view, a, b, c)

const thunk$4 = <a, b, c, d> (key:string,
                              view:(a:a, b:b, c:c, d:d, ..._:any) => ChildNode,
                              a:a, b:b, c:c, d:d):ThunkNode =>
  thunk$$(key, view, a, b, c, d)

const thunk$5 = <a, b, c, d, e> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e)

const thunk$6 = <a, b, c, d, e, f> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e, f:f):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e, f)

const thunk$7 = <a, b, c, d, e, f, g> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e, f, g)

const thunk$8 = <a, b, c, d, e, f, g, h> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e, f, g, h)

const thunk$9 = <a, b, c, d, e, f, g, h, i> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e, f, g, h, i)

const thunk$10 = <a, b, c, d, e, f, g, h, i, j> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j, ..._:any) => ChildNode,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j):ThunkNode =>
  thunk$$(key, view, a, b, c, d, e, f, g, h, i, j)

export type thunk
  = typeof(thunk$0)
  | typeof(thunk$1)
  | typeof(thunk$2)
  | typeof(thunk$3)
  | typeof(thunk$4)
  | typeof(thunk$5)
  | typeof(thunk$6)
  | typeof(thunk$7)
  | typeof(thunk$8)
  | typeof(thunk$9)
  | typeof(thunk$10)

const thunk$$:thunk = (key, view, ...args) =>
  ({$$typeof: "ThunkNode", key, force: () => view(...args)})

  const orphanThunk$0 = (key:string, view:(..._:any) => ChildNode):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view)

  const orphanThunk$1 = <a> (key:string, view:(a:a, ..._:any) => ChildNode, a:a):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a)

  const orphanThunk$2 = <a, b> (key:string,
                          view:(a:a, b:b, ..._:any) => ChildNode,
                          a:a, b:b):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b)

  const orphanThunk$3 = <a, b, c> (key:string,
                             view:(a:a, b:b, c:c, ..._:any) => ChildNode,
                             a:a, b:b, c:c):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c)

  const orphanThunk$4 = <a, b, c, d> (key:string,
                                view:(a:a, b:b, c:c, d:d, ..._:any) => ChildNode,
                                a:a, b:b, c:c, d:d):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d)

  const orphanThunk$5 = <a, b, c, d, e> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e)

  const orphanThunk$6 = <a, b, c, d, e, f> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, f:f, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e, f:f):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e, f)

  const orphanThunk$7 = <a, b, c, d, e, f, g> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e, f:f, g:g):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e, f, g)

  const orphanThunk$8 = <a, b, c, d, e, f, g, h> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e, f, g, h)

  const orphanThunk$9 = <a, b, c, d, e, f, g, h, i> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e, f, g, h, i)

  const orphanThunk$10 = <a, b, c, d, e, f, g, h, i, j> (key:string,
                                   view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j, ..._:any) => ChildNode,
                                   a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j):OrphanNode<ThunkNode>|ThunkNode =>
    orphanThunk$$(key, view, a, b, c, d, e, f, g, h, i, j)

export type orphanThunk
  = typeof(orphanThunk$0)
  | typeof(orphanThunk$1)
  | typeof(orphanThunk$2)
  | typeof(orphanThunk$3)
  | typeof(orphanThunk$4)
  | typeof(orphanThunk$5)
  | typeof(orphanThunk$6)
  | typeof(orphanThunk$7)
  | typeof(orphanThunk$8)
  | typeof(orphanThunk$9)
  | typeof(orphanThunk$10)

const orphanThunk$$:orphanThunk = (key, view, ...args) =>
  ({
    $$typeof: "OrphanNode",
    force: () => ({
      $$typeof: "ThunkNode",
      key,
      force: () => view(...args)
    })
  })

export type Renderer = {node: node, text: text, thunk: thunk, render: render}
