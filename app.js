"use strict";

var foldp = require("./signal").foldp
var start = require("./signal").start
var diff = require("./html").diff
var select = require("./html").select

function app(input) {
  // maintain state of and post messages with tree changes.
  var tree = foldp(function(past, present) {
    var changes = JSON.parse(JSON.stringify(diff(past, present)))
    self.postMessage(changes)
    return present
  }, input.value, input)

  // receive events via messages and dispatch to vnode
  // listener.
  self.addEventListener("message", function(message) {
    var event = message.data
    if (event) {
      var node = select(event.path, tree.value)
      node.handleEvent(event)
    }
  })

  start(tree)
  self.postMessage(input.value.withPath().toJSON())
}
exports.app = app
