"use strict";

var diff = require("./html").diff
var commit = require("vdom/patch")
var createElement = require("vdom/create-element")
var Frames = require("./animation").Frames
var sampleOn = require("./signal").sampleOn
var dropIf = require("./signal").dropIf
var foldp = require("./signal").foldp
var start = require("./signal").start
var receive = require("./signal").receive
var listen = require("./listener").listen
var select = require("./html").select

var create = function(tree) {
  tree.setPath("")
  return createElement(tree)
}

var dropRepeats = function(input) {
  var output = dropIf(function(x) {
    return x === input.value
  }, input.value, input)
  return output
}


function write(html, root) {
  var frames = new Frames(root)
  var input = dropRepeats(sampleOn(frames, html))


  var tree = create(input.value)
  var loop = foldp(function(past, present) {
    var changes = diff(past, present)
    commit(tree, changes)
    return present
  }, input.value, input)
  start(loop)
  root.appendChild(tree)
  listen(function(event) {
    var node = loop.value
    var target = getNode(node, event.path.split("."))
    target.listeners.forEach(function(listener) {
      if (listener.type === event.type) {
        listener.handleEvent(event)
      }
    })
  }, root)
}
exports.write = write
