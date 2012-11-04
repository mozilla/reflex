"use strict";

var diff = require("diffpatcher/diff")
var patch = require("diffpatcher/patch")
var rebase = require("diffpatcher/rebase")

var make = Object.create || (function() {
  function Type() {}
  return function make(prototype) {
    Type.prototype = prototype
    return new Type()
  }
})()

var uuid = (function() {
  // If `Date.now()` is invoked twice quickly, it's possible to get two
  // identical time stamps. To avoid generation duplications in `uuid`
  // subsequent calls are manually ordered to force uniqueness.
  var last = 0
  var count = 1
  var adjusted
  return function uuid() {
    var time = Date.now()
    var adjust = time
    if (last === time) adjust += ((count++) / 1000)
    else count = 1

    last = time
    if (adjust === adjusted) return uuid()
    adjusted = adjust
    return adjust.toString(32)
  }
})()


// Generated unique name is used to store `delta` on the state object
// which is object containing changes from previous state to current.
var delta = "delta@" + module.id
var id = "uuid@" + module.id
var parent = "parent@" + module.id

// State is a type used for representing application states. Primarily
// reason to have a type is to have an ability implement polymorphic
// methods for it.
function State() {}

// Returns diff that has being applied to a previous state to get to a
// current one.
diff.define(State, function diff(from, to) {
  // If state does not contains delta property then it's initial,
  // so diff to get to the current state should be a diff itself.
  return to[parent] === from[id] ? to[delta] : diff.calculate(from, to)
})

// Patches given `state` with a given `diff` creating a new state that is
// returned back.
patch.define(State, function patch(state, diff) {
  var value = new State()
  // Store `diff` is stored so that it can be retrieved without calculations.
  value[delta] = diff
  value[parent] = state[id]

  return rebase(make(value), state, diff)
})


function state() {
  /**
  Creates an object representing a state snapshot.
  **/
  var value = new State()
  value[id] = uuid()
  value[parent] = null
  return make(value)
}
state.type = State

module.exports = state
