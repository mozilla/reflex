"use strict";

var test = require("reducers/test/util/test")

var writer = require("../writer")
var collection = require("../collection")

var concat = require("reducers/concat")
var delay = require("reducers/delay")


var write = writer(function swap(target, delta) {
  delta.type = "read"
  target.push(delta)
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

  var reactor = collection(function reactor(options) {
    return function reactor(options) {
      return concat(delay("<="), write(options))
    }
  })
  var actual = reactor({ input: data })

  assert(actual, [
    { "@1": "<=" },
    { "@2": "<=" },
    { "@1": { text: "hello 1", done: false, type: "read" } },
    { "@2": { text: "hello 2", done: true, type: "read" } },
    { "@2": { done: false, type: "read" } }
  ], "component forks and joins")
})


if (require.main == module)
  require("test").run(exports)
