"use strict";

var State = require("./state")

var filter = require("reducers/filter")
var takeWhile = require("reducers/take-while")
var map = require("reducers/map")
var reductions = require("reducers/reductions")
var merge = require("reducers/merge")
var concat = require("reducers/concat")
var hub = require("reducers/hub")

var patch = require("diffpatcher/patch")

var has = require("oops/has")
var field = require("oops/field")
var dictionary = require("oops/dictionary")
var isnt = require("oops/isnt")

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

    // Inputs is consumed by multiple consumers so and there for
    // we multiplex it to make sure that all the transformations
    // till this point are shared.
    inputs = hub(inputs)
    // Accumulate a state, this way new forks of the inputs can be
    // made for a new items added to a state.
    var state = State()
    var outputs = reductions(inputs, function(output, delta) {
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

          return map(output, dictionary(id))
        }
      })

      // Patch previous state with a new one (patch will also garbage collect
      // nodes that have deleted in previous updates).
      state = patch(state, delta)

      // Since output can be generated of multiple reactors we merge it to
      // get uniform output.
      return merge(output)
    })

    // Merge all the outputs that reductions over inputs will produce. This
    // mainly takes care of including outputs of the new nested items into
    // resulting output.
    return merge(outputs)
  }
}

module.exports = component
