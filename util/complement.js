"use strict";

function complement(f) {
  /**
  Takes a `f` function and returns a new function that takes the same arguments
  as `f`, has the same effects, if any, and returns the opposite truth value.
  **/
  return function complemented() {
    return !f.apply(this, arguments)
  }
}
