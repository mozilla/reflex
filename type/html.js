/* @flow */

import {VirtualNode, ChildNode, OrphanNode} from "./dom"

export type element = (properties:Object, children:?Array<ChildNode>) =>
  VirtualNode|OrphanNode<VirtualNode>

export type html = {[key:string]: element}
