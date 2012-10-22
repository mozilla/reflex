/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

function rebase(result, state, diff) {
  Object.keys(state).forEach(function(key) {
    // If `state[key]` is `null` it means attribute was deleted in previous
    // update. We skip such properties as there is no use in keeping them
    // around.
    if (state[key] !== null) result[key] = state[key]
  }, result)
  Object.keys(diff).forEach(function(key) {
    if (key in state) {
      var current = diff[key]
      var previous = state[key]
      // If `diff[key]` is `null` it's delete so we just update result.
      if (current === null) result[key] = current
      // If value is of primitive type (function or regexps should not
      // even be here) we just update in place.
      else if (typeof(current) !== "object") result[key] = current
      // If previous value associated with this key was primitive
      // and it's mapped to non primitive
      else if (typeof(previous) !== "object") result[key] = current
      else result[key] = rebase({}, previous, current)
    } else {
      result[key] = diff[key]
    }
  })
  return result
}

module.exports = rebase
