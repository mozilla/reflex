"use strict";

var collection = require("./collection")
var atom = require("./atom")

var state = require("./state")

var patch = require("diffpatcher/patch")

var hub = require("reducers/hub")
var fold = require("reducers/fold")
var concat = require("reducers/concat")
var filter = require("reducers/filter")
var map = require("reducers/map")
var takeWhile = require("reducers/take-while")

var has = require("oops/has")
var field = require("oops/field")
var isnt = require("oops/isnt")

function model(schema, name) {
  if (Array.isArray(schema)) return collection(model(schema[0]), name)

  var writers = Object.keys(schema).reduce(function(writers, id) {
    var attribute = schema[id]
    writers[id] = typeof(attribute) === "function" ? atom(attribute, id) :
                  model(attribute, id)
    return writers
  }, {})

  return function(input, target) {
    input = hub(input)
    fold(input, function(delta, state) {
      Object.keys(delta).map(function(id) {
        if (state[id] === void(0)) {
          var fork = concat(delta, input)
          var changes = filter(fork, has(id))
          var updates = map(changes, field(id))
          var write = writers[id]
          write(takeWhile(updates, isnt(null)), target)
        }
      })
      return patch(state, delta)
    }, state())
  }
}

module.exports = model
