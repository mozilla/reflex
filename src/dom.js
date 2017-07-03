/* @flow */

import { Driver, Node } from "reflex-driver"
import type { Properties } from "reflex-driver"
import type { Address } from "./signal"

export class LazyRoot<model, message> implements Node {
  state: model
  view: (state: model, mailbox: Address<message>) => *
  mailbox: Address<message>
  constructor(
    view: (state: model, mailbox: Address<message>) => *,
    state: model,
    mailbox: Address<message>
  ) {
    this.state = state
    this.view = view
    this.mailbox = mailbox
  }
  renderWith<node: Node>(renderer: Driver<node>): node {
    driver = renderer
    return this.view(this.state, this.mailbox)
  }
}

class ErrorDriver implements Driver<Node> {
  createElement(..._): Node {
    throw new Error(`You need to use a reflex driver to create element nodes`)
  }
  createElementNS(..._): Node {
    throw new Error(`You need to use a reflex driver to create element nodes`)
  }
  createTextNode(..._): Node {
    throw new Error(`You need to use a reflex driver to create text nodes`)
  }
  createThunk(..._): Node {
    throw new Error(`You need to use a reflex driver to create thunk nodes`)
  }
  render(node: Node): void {
    throw new Error(`You need to use a reflex driver to render nodes`)
  }
}

let driver: Driver<any> = new ErrorDriver()

export const text = (content: string): Node => driver.createTextNode(content)

export const element = (
  tagName: string,
  properties: ?Properties,
  children: ?Array<string | Node>
): Node => driver.createElement(tagName, properties, children)

export const elementNS = (
  namespaceURI: string,
  tagName: string,
  properties: ?Properties,
  children: ?Array<string | Node>
): Node => driver.createElementNS(namespaceURI, tagName, properties, children)

export const thunk: <a, b, c, d, e, f, g, h, i, j>(
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
  ) => Node,
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
) => Node = (key, view, ...args) => driver.createThunk(key, view, (args: any))
