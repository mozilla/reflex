/* @flow */

export type Key = string
export type TagName = string
export type Text = string

export type VirtualText = {
  $type: "VirtualText",
  text: string
};

export type VirtualNode = {
  $type: "VirtualNode",
  key: ?Key,
  tagName: TagName,
  namespace: ?string,
  children: Array<VirtualTree>
};

export type Thunk = {
  $type: "Thunk",
  key: Key,
};

export type Widget = {
  $type: "Widget",
  initialize: () => Element,
  update: (previous:Widget, node:Element) => ?Element,
  destroy: (node:Element) => void
}

export type Arguments <params> = Array<any>
export type View <params> = (...args:Array<any>) => VirtualTree

export type LazyTree <Tree> = {
  $type: "LazyTree",
  force: () => Tree
}

export type VirtualTree
  = Text
  | VirtualText
  | VirtualNode
  | Thunk
  | Widget
  | LazyTree <VirtualNode>
  | LazyTree <Thunk>

export type DOM = VirtualTree

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


export type text = (content:Text)
  => Text
  |  VirtualText

export type node = (tagName:TagName, properties:?PropertyDictionary, children:?Array<VirtualTree>)
  => VirtualNode
  |  LazyTree<VirtualNode>


const thunk$0 = (key:string, view:(..._:any) => VirtualTree):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view)

const thunk$1 = <a> (key:string, view:(a:a, ..._:any) => VirtualTree, a:a):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a)

const thunk$2 = <a, b> (key:string,
                        view:(a:a, b:b, ..._:any) => VirtualTree,
                        a:a, b:b):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b)

const thunk$3 = <a, b, c> (key:string,
                           view:(a:a, b:b, c:c, ..._:any) => VirtualTree,
                           a:a, b:b, c:c):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c)

const thunk$4 = <a, b, c, d> (key:string,
                              view:(a:a, b:b, c:c, d:d, ..._:any) => VirtualTree,
                              a:a, b:b, c:c, d:d):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d)

const thunk$5 = <a, b, c, d, e> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d, e)

const thunk$6 = <a, b, c, d, e, f> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d, e, f)

const thunk$7 = <a, b, c, d, e, f, g> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g)

const thunk$8 = <a, b, c, d, e, f, g, h> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g, h)

const thunk$9 = <a, b, c, d, e, f, g, h, i> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i):LazyTree<Thunk>|Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g, h, i)

const thunk$10 = <a, b, c, d, e, f, g, h, i, j> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j):LazyTree<Thunk>|Thunk =>
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
  ({
    $type: "LazyTree",
    force: () => ({
      $type: "Thunk",
      key,
      force: () => view(...args)
    })
  })
