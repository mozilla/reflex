"use strict";

var writer = require("../writer")
var takeWhile = require("reducers/take-while")
var delay = require("reducers/delay")
var test = require("reducers/test/util/test")
var concat = require("reducers/concat")

exports["test writer"] = function(assert) {
  var write = writer(function swap(target, delta) {
    target.push(delta)
    return target
  }, function open(options) {
    return []
  }, function close(target) {
    target.push("end")
  })

  var target = write({
    input: [
    "initial-state",
    "state-1",
    "state-2",
    "state-3"
    ]
  })


  assert.deepEqual(target, [
    "initial-state",
    "state-1",
    "state-2",
    "state-3",
    "end"
  ], "data has being written as expected")
}

exports["test take-while on writer"] = function(assert) {
  var input = [
    { text: "hello" },
    { text: "world" },
    { text: ""},
    { text: "bye"}
  ]

  var write = writer(function swap(target, delta) {
    target.push(delta)
    return target
  }, function open(options) {
    return []
  }, function close(target) {
    target.push(null)
  })

  var target = write({
    input: takeWhile(input, function(data) { return Boolean(data.text) })
  })


  assert.deepEqual(target, [
    { text: "hello" },
    { text: "world" },
    null
  ], "data has being written until empty")
}

exports["test async input on writer"] = test(function(assert) {
  var async = false
  var input = delay([
    { text: "hello" },
    { text: "world" },
    { text: ""},
    { text: "bye"}
  ])

  var write = writer(function swap(target, delta) {
    target.push(delta)
  }, function open(options) {
    return [ async ]
  }, function close(target) {
    target.push(async)
  })

  var result = write({
    input: takeWhile(input, function(data) { return Boolean(data.text) })
  })

  // Concat to input so that write has chance to accumulate.
  var actual = concat(input, result)


  assert(actual, [
    { text: "hello" },
    { text: "world" },
    { text: ""},
    { text: "bye"},

    false,
    { text: "hello" },
    { text: "world" },
    true
  ], "works on async")

  async = true
})

if (require.main === module)
  require("test").run(exports)
