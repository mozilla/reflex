"use strict";

var State = require("./state")

var patch = require("diffpatcher/patch")

var hub = require("reducers/hub")
var fold = require("reducers/fold")
var concat = require("reducers/concat")
var filter = require("reducers/filter")
var map = require("reducers/map")
var reductions = require("reducers/reductions")
var takeWhile = require("reducers/take-while")
var merge = require("reducers/merge")

var has = require("oops/has")
var field = require("oops/field")
var isnt = require("oops/isnt")
var dictionary = require("oops/dictionary")


var keys = Object.keys

function collection(Reactor) {
  return function collectionReactor(options) {
    var context = options.context || []
    var target = options.target
    // Inputs is consumed by multiple consumers, there for it's multiplexed
    // to make sure all transformations over it happen just once.
    var input = hub(options.input)
    // Accumulate a state, to know about alive nested items.
    var state = State()
    var reactor = Reactor({ target: target, context: context })
    var outputs = reductions(input, function(_, delta) {
      var outputs = keys(delta).reduce(function(outputs, id) {
        if (state[id] === void(0)) {
          var changes = filter(input, has(id))
          var updates = concat(delta, changes)
          var fork = map(updates, field(id))
          var output = reactor({
            input: takeWhile(fork, isnt(null)),
            target: target,
            context: context.concat(id)
          })
          outputs.push(map(output, dictionary(id)))
        }
        return outputs
      }, [])

      // Patch previous state with a new one (patch will also garbage collect
      // nodes that have being deleted in previous update).
      state = patch(state, delta)

      // Merge outputs from all new collection items to form unified output.
      return merge(outputs)
    })

    // Merge all outputs and multiplex it, so that consumers down the flow
    // would share transformations from this point on.
    return hub(merge(outputs))
  }
}

module.exports = collection
