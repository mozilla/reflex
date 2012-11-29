"use strict";

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

function collection(writer) {
  return function(input, target, context) {
    context = context || []
    input = hub(input)
    var write = writer(input, target, context)
    fold(input, function(delta, state) {
      Object.keys(delta).map(function(id) {
        if (state[id] === void(0)) {
          var fork = concat(delta, input)
          var changes = filter(fork, has(id))
          var updates = map(changes, field(id))
          write(takeWhile(updates, isnt(null)), target, context.concat(id))
        }
      })
      return patch(state, delta)
    }, state())
  }
}

module.exports = collection
