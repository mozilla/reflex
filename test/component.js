"use strict";

var test = require("reducers/test/util/test")

var writer = require("../writer")
var component = require("../component")
var reactor = require("../reactor")

var concat = require("reducers/concat")
var delay = require("reducers/delay")


var write = writer(function swap(output, delta) {
  output.push(delta)
}, function close(output) {
}, function open(options) {
  return []
})

exports["test component"] = test(function(assert) {
  var data = [
    { "@1": { text: "hello 1", done: false } },
    { "@2": { text: "hello 2", done: true } },
    { "@2": { done: false } }
  ]

  var reads = 0

  var c = component(reactor(write, function(output) {
    // Delay output to let it writer aggregate it
    return concat(delay("<="), output)
  }))

  var actual = c(data)

  assert(actual, [
    { "@1": "<=" },
    { "@2": "<=" },
    { "@1": { text: "hello 1", done: false } },
    { "@2": { text: "hello 2", done: true } },
    { "@2": { done: false } }
  ], "component forks and joins")
})


if (require.main == module)
  require("test").run(exports)
