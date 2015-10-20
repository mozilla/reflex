/* @flow */

import {VirtualNode, VirtualTree, LazyTree} from "./dom"

export type element = (properties:Object, children:?Array<VirtualTree>) =>
  VirtualNode|LazyTree<VirtualNode>

export type html = {[key:string]: element}
