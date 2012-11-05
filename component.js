"use strict";

var state = require("./state")

var signal = require("signalr/signal")
var filter = require("reducers/filter")
var takeWhile = require("reducers/take-while")
var map = require("reducers/map")
var reduce = require("reducers/reduce")
var reductions = require("reducers/reductions")
var merge = require("reducers/flatten")
var concat = require("reducers/concat")

var patch = require("diffpatcher/patch")

var has = require("./util/has")
var field = require("./util/field")
var association = require("./util/association")
var isnt = require("./util/isnt")

var keys = Object.keys

function component(react) {
  /**
  Component produces a `reactor` out of a given `react` function.
  **/

  return function reactor(inputs, options) {
    /**
    Function takes stream of state changes for the component it's responsible
    for and applies them by writing. As a return value it returns steam of
    changes caused by component it's responsible for in equivalent structure
    as reads.

    Given state `changes` must be a stream of data structures in a following
    format:

    Change 1:

        {
          "item-1": { "text": "foo", "completion": true }
        }

    Change 2:

        {
          "item-2": null
        }

    Change 3:

        {
          "item-3": { "text": "bar" }
        }

    It's always a `hash` where keys are unique identifiers for the nested
    components and values are deltas that must be applied to a components
    state. Each attribute of the value describes new state of the associated
    field, in the change 1 `text` field of the component with an id
    `item-1` has changed to `"foo"` while it's `completion` field has changed
    to `true`. In change 2 nested `item-2` is deleted entirely. In the change 3
    `text` field for the `item-3` has changed to `"bar"`.

    Also note that given example assumes nested components, but that does not
    necessary needs to be the case. If component represents simple UI widget
    like text field it will just get stream of updates with a same identifier:

    Change 1:

        { "text": "Hello" }

    Change 2:

        { "text": "world" }
    **/

    var result = state()
    var outputs = reductions(inputs, function react(output, delta) {
      output = keys(delta).map(function forEachEntity(id) {
        // If it's first time we're seeing this item we create a
        // fork of state updates for it.
        if (state[id] === void(0)) {
          // This specific change is already being dispatched which means
          // that reading from `changes` now won't include it. Although
          // entity associated with this specific update should still
          // get it. There for we prepend changes with a current `delta`.
          var fork = concat(delta, inputs)
          // Filter stream of changes to a stream of changes to the entity
          // with a given id.
          var entityChanges = filter(fork, has(id))
          // Map changes for the given entity to an actual change deltas
          var entityUpdates = map(entityChanges, field(id))
          // Take updates only up until update state is `null` since that
          // means close of the entity.
          var updates = takeWhile(entityUpdates, isnt(null))
          // And pass updates to the reactor.
          var output = react(updates, options)

          return map(output, association(id))
        }
      })

      // Patch previous state with a new one patch will also garbage collect
      // nodes that have deleted in previous updates.
      result = patch(result, delta)

      return merge(output)
    })

    // Return joined stream of all inputs from all the entities of this
    // component.
    return merge(outputs)
  }
}

module.exports = component
