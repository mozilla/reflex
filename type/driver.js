/* @flow */

import {Address} from "./signal"
import {TagName, PropertyDictionary, VirtualNode, VirtualText,
        Thunk, VirtualTree} from "./dom"

export type render = (tree:VirtualTree) => void

export type text = (content:string) => VirtualText

export type node = (tagName:TagName, properties:?PropertyDictionary, children:?Array<VirtualTree>)
  => VirtualNode

const thunk$0 = (key:string, view:(..._:any) => VirtualTree):Thunk =>
  thunk$$(key, view)

const thunk$1 = <a> (key:string, view:(a:a, ..._:any) => VirtualTree, a:a):Thunk =>
  thunk$$(key, view, a)

const thunk$2 = <a, b> (key:string,
                        view:(a:a, b:b, ..._:any) => VirtualTree,
                        a:a, b:b):Thunk =>
  thunk$$(key, view, a, b)

const thunk$3 = <a, b, c> (key:string,
                           view:(a:a, b:b, c:c, ..._:any) => VirtualTree,
                           a:a, b:b, c:c):Thunk =>
  thunk$$(key, view, a, b, c)

const thunk$4 = <a, b, c, d> (key:string,
                              view:(a:a, b:b, c:c, d:d, ..._:any) => VirtualTree,
                              a:a, b:b, c:c, d:d):Thunk =>
  thunk$$(key, view, a, b, c, d)

const thunk$5 = <a, b, c, d, e> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e):Thunk =>
  thunk$$(key, view, a, b, c, d, e)

const thunk$6 = <a, b, c, d, e, f> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f):Thunk =>
  thunk$$(key, view, a, b, c, d, e, f)

const thunk$7 = <a, b, c, d, e, f, g> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g):Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g)

const thunk$8 = <a, b, c, d, e, f, g, h> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h):Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g, h)

const thunk$9 = <a, b, c, d, e, f, g, h, i> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i):Thunk =>
  thunk$$(key, view, a, b, c, d, e, f, g, h, i)

const thunk$10 = <a, b, c, d, e, f, g, h, i, j> (key:string,
                                 view:(a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j, ..._:any) => VirtualTree,
                                 a:a, b:b, c:c, d:d, e:e, f:f, g:g, h:h, i:i, j:j):Thunk =>
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
  ({$type: "Thunk", key, force: () => view(...args)})


export type Driver = {
  node: node,
  text: ?text,
  thunk: thunk,
  address: Address<VirtualRoot>,

  render: render
}

// Root node is a lazy (uncomputed & unrendered) representation of the
// application view that can be rendered with reflex renderer by calling
// `renderWith` method.
export type VirtualRoot = {
  $type: "VirtualRoot",
  renderWith: (driver:Driver) => void
}
