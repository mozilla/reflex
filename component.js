"use strict";

var state = require("./state")

var channel = require("reducers/channel")
var emit = require("reducers/emit")
var filter = require("reducers/filter")
var map = require("reducers/map")
var reduce = require("reducers/reduce")
var flatten = require("reducers/flatten")

var patch = require("diffpatcher/patch")

var has = require("./util/has")
var field = require("./util/field")
var association = require("util/association")

var keys = Object.keys

function component(read, write) {
  /**
  Component produces a `reactor` function out of given `write` function
  responsible for applying state changes to a single entity of the component
  and a `read` function that is responsible for reading state changes caused
  by interaction with that entity. In case of UI component is likely to be
  a widget. Given `write` function will reflect changes to the view of that
  widget while `read` function will map user interaction events to that widget
  into state changes.
  **/

  return function reactor(changes, options) {
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

    // Define a channel where input stream of changes for each individual
    // entity will be queued. Merging it will produce stream of inputs
    // of all the entities this component is consists of.
    var inputs = channel()

    reduce(changes, function react(state, delta) {
      keys(delta).forEach(function forEachEntity(id) {
        if (delta[id] === null) {
          state[id] = null
        }
        else if (state[id] != void(0)) {
          // Filter stream of changes to a stream of changes to the entity
          // with a given id.
          var entityChanges = filter(changes, has(id))
          // Map changes for the given entity to an actual change deltas
          var entityUpdates = map(entityChanges, field(id))
          // And write entity updates into entity. Note that initial write
          // as one here will actually create that entity returning it back.
          // Also all subsequent updates will be automatically written into it.
          var entity = write(entityUpdates, options)
          // Start reading stream of changes caused by the entity. It is also
          // mapped back to same structure of updates as changes were.
          var input = read(entity, options)
          var deltas = map(input, association(id))

          // Emit stream of changes caused by entity onto `inputs` channel.
          emit(inputs, deltas)
        }
      })

      // Patch previous state with a new one patch will also garbage collect
      // nodes that have deleted in previous updates.
      return patch(state, delta)
    }, state())

    // Return joined stream of all inputs from all the entities of this
    // component.
    flatten(inputs)
  }
}

module.exports = component
