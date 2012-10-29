"use strict";

var state = require("reflex/state")

var reductions = require("reducers/reductions")
var channel = require("reducers/channel")
var pipe = require("reducers/pipe")

var patch = require("diffpatcher/patch")
var diff = require("diffpatcher/diff")

var keys = Object.keys


function overlay(mapping) {
  /**
  Function takes overlay `mapping` that is `id` mapped to a function value
  responsible for computing a value for that id. Each function will be used
  to perform a reductions over a stream of state updates. In return they
  supposed to compute value for the given `id`. In return this function
  returns a function which given a stream of state changes will return
  equivalent stream of changes but with a computed properties added.
  This allows adding computed fields to a state model so that units and
  components could use them as regular state attributes. Also note that
  resulting stream will only contain changes to the computed properties
  if they actually changed.

  ## Example

      var foo = overlay({
        count: function(previous, current) {
            var items = current.items
            var ids = Object.keys(items)
            var completed = ids.map(function(id) {
              return items[id]
            }).filter(function(item) {
              return item.completed
            }).length

            return {
              all: items.count,
              completed: completed,
              pending: count - completed
            }
          }
      })
  **/

  // Cache keys of the mapping in an array to avoid call overhead on each
  // update.
  var ids = keys(mapping)
  function compute(input) {
    /**
    Function takes `input` of state updates and returns equivalent stream
    but with computed properties added which were defined in curried `mapping`
    **/
    var previous = state()
    var overlay = state()
    var stream = channel()

    var transformed = reductions(input, function(_, delta) {
      // Compute current state without changes to computed properties
      // by applying `delta` to a previous state with computed properties.
      var current = patch(previous, delta)
      // Compute new overlay by running each attribute computation.
      var computed = ids.reduce(function(delta, id) {
        // Attribute computations are invoked with a previous computed
        // state & current state without computed properties. Complete state
        // is most likely what is needed to calculate a new value. Although
        // if in some cases `delta` is a better option, it still can be
        // calculated by `diff`-ing provided values that will return `delta`
        // by using an optimized code path.
        delta[id] = mapping[id](previous, current)
        return delta
      }, {})
      // Computed delta with computed properties by applying delta
      // between `overlay` (previously computed properties) and `computed`
      // (currently computed properties) to the state change delta. This
      // way only changed computed properties will be added which will avoid
      // further reactions down the data flow.
      delta = patch(delta, diff(overlay, computed))
      // Update previous computed state by patching previous state
      // with delta that contains computed properties.
      previous = patch(previous, delta)
      // Also update overlay value with a current version of computed values.
      overlay = computed

      // Finally return delta with changed computed properties added to it
      // so that reactors down the flow will react on updates with computed
      // properties.
      return delta
    })

    pipe(transformed, stream)

    return stream
  }

  return compute
}

module.exports = overlay
