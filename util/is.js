"use strict";

function is(expected) {
  /**
  High order function that returns an assertion function which compares
  with curried `expected` against passed value via `===` and returns the
  result.
  **/
  function assert(actual) {
    return actual === expected
  }
}

module.exports = is
