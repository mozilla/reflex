"use strict";

function has(name) {
  /**
  High order function that returns predicate function which will return
  `true` if given `hash` has a field with that `name` and `false` if doesn't.
  **/
  return function hasField(hash) {
    return hash[name]
  }
}

module.exports = has
