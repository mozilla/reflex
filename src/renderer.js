/* @flow */

/*::
import * as type from "../type"
import type {Address} from "./signal"
*/

let backend/*:?type.Renderer*/ = null

export class RootNode /*::<model, action>*/ {
  /*::
  $$typeof: "RootNode";

  view: type.View<[model, action]>;
  model: model;
  address: Address<action>;
  */
  constructor(view/*:type.View<[model, action]>*/, model/*:model*/, address/*:Address<action>*/) {
    this.view = view
    this.model = model
    this.address = address
  }
  renderWith(renderer/*:type.Renderer*/) {
    const before = backend
    backend = renderer

    try {
      renderer.render(this.view(this.model, this.address))
    } finally {
      backend = before
    }
  }
}
RootNode.prototype.$$typeof = "RootNode"


export class TextNode {
  /*::
  $$typeof: "OrphanNode";

  text: string;
  */
  constructor(text/*:string*/) {
    this.text = text
  }
  force()/*:type.TextNode*/ {
    if (!backend) {
      throw TypeError('OrphanNode may only be forced from with in the RootNode.renderWith(renderer) call')
    }

    return backend.text(this.text)
  }
}
TextNode.prototype.$$typeof = "OrphanNode";

export class VirtualNode {
  /*::
  $$typeof: "OrphanNode";

  tagName: type.TagName;
  properties: Object;
  children: ?Array<type.ChildNode>;
  key: ?type.Key;
  namespace: string;
  */
  constructor(tagName/*:type.TagName*/, properties/*:Object*/, children/*:?Array<type.ChildNode>*/) {
    this.tagName = tagName
    this.properties = properties
    this.children = children
    this.key = properties.key
  }
  force()/*:type.VirtualNode*/{
    if (!backend) {
      throw TypeError('OrphanNode may only be forced from with in the RootNode.renderWith(renderer) call')
    }

    return backend.node(this.tagName, this.properties, this.children)
  }
}
VirtualNode.prototype.$$typeof = "OrphanNode";

export class ThunkNode <params>{
  /*::
  $$typeof: "OrphanNode";

  key: type.Key;
  view: type.View<params>;
  args: type.Arguments<params>;
  */
  constructor(key/*:type.Key*/, view/*:type.View<params>*/, args/*:type.Arguments<params>*/) {
    this.key = key
    this.view = view
    this.args = args
  }
  force()/*:type.ThunkNode<params>*/ {
    if (!backend) {
      throw TypeError('OrphanNode may only be forced from with in the RootNode.renderWith(renderer) call')
    }

    return backend.thunk(this.key, this.view, ...this.args)
  }
}
ThunkNode.prototype.$$typeof = "OrphanNode";

export const thunk = /*::<params>*/ (key/*:type.Key*/, view/*:type.View<params>*/, ...args/*:Array<any>*/)/*:type.OrphanNode<type.ThunkNode<params>>*/ =>
  new ThunkNode(key, view, ...args)

export const node = (tagName/*:type.TagName*/, properties/*:Object*/, children/*:?Array<type.ChildNode>*/)/*:type.OrphanNode<type.VirtualNode>*/ =>
  new VirtualNode(tagName, properties, children != null ? children : [])

export const text = (textContent/*:string*/)/*:type.OrphanNode<type.TextNode>*/ =>
  new TextNode(textContent)
