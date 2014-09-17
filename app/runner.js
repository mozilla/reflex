"use strict";

var listen = require("../listener").listen
var foldp = require("../signal").foldp
var start = require("../signal").start
var commit = require("vdom/patch")
var createElement = require("vdom/create-element")

function run(app, root) {
  if (root.children.length)
    throw Error("Not an empty element root is not supported")

  var events = listen(root)
  var task = foldp(function(tree, state) {
    return tree ? commit(tree, state) :
           root.appendChild(createElement(state))
  }, null, app.input(events))

  start(task)
}
exports.run = run
