"use strict";

var State = require("./state")

var patch = require("diffpatcher/patch")

var hub = require("reducers/hub")
var fold = require("reducers/fold")
var concat = require("reducers/concat")
var filter = require("reducers/filter")
var map = require("reducers/map")
var takeWhile = require("reducers/take-while")
var reductions = require("reducers/reductions")
var merge = require("reducers/merge")

var has = require("oops/has")
var field = require("oops/field")
var isnt = require("oops/isnt")
var dictionary = require("oops/dictionary")

function collection(writer) {
  return function(input, target, context) {
    context = context || []
    input = hub(input)
    var write = writer(input, target, context)
    var state = State()
    var outputs = reductions(input, function(_, delta) {
      var output = Object.keys(delta).map(function(id) {
        if (state[id] === void(0)) {
          var fork = concat(delta, input)
          var changes = filter(fork, has(id))
          var updates = map(changes, field(id))
          var output = write(takeWhile(updates, isnt(null))
            , target, context.concat(id))

          return map(output, dictionary(id))
        }
      })
      state = patch(state, delta)

      return merge(output)
    })

    return merge(outputs)
  }
}

module.exports = collection
