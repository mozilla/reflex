"use strict";

var writer = require("../writer")
var takeWhile = require("reducers/take-while")
var delay = require("reducers/delay")
var test = require("reducers/test/util/test")
var concat = require("reducers/concat")

exports["test writer"] = function(assert) {
  var config = {}

  var write = writer(function swap(output, delta) {
    output.push(delta)
    return output
  }, function close(output) {
    output.push("end")
  }, function open(options) {
    options.output = []
    assert.equal(options, config, "options match")
    return options.output
  })

  write([
    "initial-state",
    "state-1",
    "state-2",
    "state-3"
  ], config)


  assert.deepEqual(config, {
    output: [
      "initial-state",
      "state-1",
      "state-2",
      "state-3",
      "end"
    ]
  }, "data has being written as expected")
}

exports["test take-while on writer"] = function(assert) {
  var config = {}
  var input = [
    { text: "hello" },
    { text: "world" },
    { text: ""},
    { text: "bye"}
  ]

  var write = writer(function swap(output, delta) {
    output.push(delta)
    return output
  }, function close(output) {
    output.push(null)
  }, function open(options) {
    options.output = []
    assert.equal(options, config, "options match")
    return options.output
  })

  write(takeWhile(input, function(data) {
    return Boolean(data.text)
  }), config)


  assert.deepEqual(config, {
    output: [
      { text: "hello" },
      { text: "world" },
      null
    ]
  }, "data has being written until empty")
}

exports["test async input on writer"] = test(function(assert) {
  var async = false
  var input = delay([
    { text: "hello" },
    { text: "world" },
    { text: ""},
    { text: "bye"}
  ])

  var write = writer(function swap(output, delta) {
    output.push(delta)
  }, function close(output) {
    output.push(async)
  }, function open(options) {
    return [ async ]
  })

  var output = write(takeWhile(input, function(data) {
    return Boolean(data.text)
  }))

  // Concat to input so that write has chance to accumulate.
  var actual = concat(input, output)


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
