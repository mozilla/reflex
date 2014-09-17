"use stict";

var VNode = require("vtree/vnode");
var VText = require("vtree/vtext");
var vdiff = require("vtree/diff");
var VirtualPatch = require("vtree/vpatch")

// Need to add toJSON methods so that patches could be
// serialized for sending as messages across workers.
VirtualPatch.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    patch: this.patch,
    vNode: this.vNode.toJSON(),
  }
}

var Text = VText
Text.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    text: this.text
  }
}
exports.Text = Text


function text(content) {
  return new Text(content)
}
exports.text = text

var Node = VNode
Node.prototype.withPath = function(base) {
  base = base || ""
  this.properties.attributes["data-reflex-path"] = base

  var index = 0
  var nodes = this.children
  while (index < nodes.length) {
    var node = nodes[index]
    if (node.withPath) {
      var key = node.properties.key || index
      node.withPath(base + "." + key)
    }
    index = index + 1
  }
  return this
}

var toJSON = function(x) {
  return x.toJSON()
}

Node.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    count: this.count,
    tagName: this.tagName,
    properties: this.properties,
    children: this.children.map(toJSON),
    key: this.key,
    namespace: this.namespace,
    hasWidgets: this.hasWidgets,
    hooks: this.hooks,
    descendantHooks: this.descendantHooks
  }
}
exports.Node = Node

function node(name, attributes, contents) {
  return new Node(name, {attributes: attributes}, contents)
}
exports.node = node

var EventNode = function (name, properties, contents, listeners) {
  var index = 0
  var count = listeners ? listeners.length : 0
  while (index < count) {
    var type = listeners[index].type
    properties.attributes["data-reflex-event-" + type] = true
    index = index + 1
  }

  Node.call(this, name, properties, contents)
  this.listeners = listeners

}
EventNode.prototype = Object.create(Node.prototype)
EventNode.prototype.constructor = EventNode
EventNode.prototype.handleEvent = function(event) {
  this.listeners.forEach(function(listener) {
    if (listener.type === event.type) {
      listener.handleEvent(event)
    }
  })
}

var eventNode = function(name, attributes, contents, listeners) {
  return new EventNode(name, {attributes: attributes}, contents, listeners)
}
exports.eventNode = eventNode


var diff = function(a, b) {
  return vdiff(a, b.withPath())
}
exports.diff = diff

var select = function(path, root) {
  var entry = root
  var level = 1
  var count = path.length
  while (level < count) {
    var key = path[level]
    entry = entry.children[key]
    level = level + 1
  }
  return entry
}
exports.select = select
