/* @flow */

/*::
import * as type from "../type/dom"
import type {Address} from "../type/signal"
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
  properties: ?type.PropertyDictionary;
  children: ?Array<type.ChildNode>;
  key: ?type.Key;
  namespace: string;
  */
  constructor(tagName/*:type.TagName*/, properties/*:?type.PropertyDictionary*/, children/*:?Array<type.ChildNode>*/) {
    this.tagName = tagName
    this.properties = properties
    this.children = children
    this.key = properties == null ? null : properties.key
  }
  force()/*:type.VirtualNode*/{
    if (!backend) {
      throw TypeError('OrphanNode may only be forced from with in the RootNode.renderWith(renderer) call')
    }

    return backend.node(this.tagName, this.properties, this.children)
  }
}
VirtualNode.prototype.$$typeof = "OrphanNode";

class ThunkNode {
  /*::
  $$typeof: "OrphanNode";

  key: type.Key;
  view: Function;
  args: Array<any>;
  */
  constructor(key/*:type.Key*/, view/*:Function*/, args/*:Array<any>*/) {
    this.key = key
    this.view = view
    this.args = args
  }
  force()/*:type.ThunkNode*/ {
    if (!backend) {
      throw TypeError('OrphanNode may only be forced from with in the RootNode.renderWith(renderer) call')
    }

    return backend.thunk(this.key, this.view, ...this.args)
  }
}
ThunkNode.prototype.$$typeof = "OrphanNode";


export const node = (tagName/*:type.TagName*/, properties/*:?type.PropertyDictionary*/, children/*:?Array<type.ChildNode>*/)/*:type.VirtualNode|type.OrphanNode<type.VirtualNode>*/ =>
  backend == null ? new VirtualNode(tagName, properties, children) :
  backend.node(tagName, properties, children)

export const text = (textContent/*:string*/)/*:type.TextNode|type.OrphanNode<type.TextNode>*/ =>
  backend == null ? new TextNode(textContent) :
  backend.text(textContent)

export const thunk/*:type.orphanThunk*/ = (key, view, ...args) =>
  backend == null ? new ThunkNode(key, view, args) :
  backend.thunk(key, view, ...args)
