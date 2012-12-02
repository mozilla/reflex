"use strict";

var test = require("reducers/test/util/test")

var model = require("../model")

var map = require("reducers/map")
var concat = require("reducers/concat")
var fold = require("reducers/fold")


function write(options) {
  var target = options.target[options.context.join(".")]
  fold(options.input, function(value) {
    target.push(value)
  })
  return target
}

function read(target) {
  return map(target, function(value) {
    return "<= " + value
  })
}

exports["test model"] = test(function(assert) {
  var reactor = model({
    title: function(options) {
      return read(write(options))
    },
    body: {
      date: function(options) {
        return read(write(options))
      },
      content: function(options) {
        return read(write(options))
      }
    }
  })

  var target = {
    "title": [],
    "body.date": [],
    "body.content": []
  }

  var output = reactor({
    target: target,
    input: [
      { title: "Untitled" },
      { body: { date: "2012-12-01" } },
      { body: { content: "Hello "}, title: "Example" },
      { body: { content: "Hello world" } },
      { body: { date: "2012-12-02", content: "Hello world!!" } }
    ]
  })

  var actual = concat(output, target)

  assert(actual, [
    { title: "<= Untitled" },
    { title: "<= Example" },
    { body: { date: "<= 2012-12-01" } },
    { body: { date: "<= 2012-12-02" } },
    { body: { content: "<= Hello "} },
    { body: { content: "<= Hello world" } },
    { body: { content: "<= Hello world!!" } },
    {
      title: ["Untitled", "Example"],
      "body.date": ["2012-12-01", "2012-12-02"],
      "body.content": ["Hello ", "Hello world", "Hello world!!"]
    }
  ], "module destructures / restructures input / output")
})

if (require.main == module)
  require("test").run(exports)
