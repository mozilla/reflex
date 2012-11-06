"use strict";

function isnt(expected) {
  /**
  High order function that returns an assertion function which compares
  with curried `expected` against passed value via `===` and returns the
  result.
  **/
  return function assert(actual) {
    return actual !== expected
  }
}

module.exports = isnt
