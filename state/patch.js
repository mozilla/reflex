/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var method = require("method")
var rebase = require("./rebase")

// Method is designed to work with data structures representing application
// state. Calling it with a state and delta should return object representing
// new state, with changes in `delta` being applied to previous.
//
// ## Example
//
// patch(state, {
//   "item-id-1": { completed: false }, // update
//   "item-id-2": null                  // delete
// })
var patch = method()
patch.define(Object, function patch(object, diff) {
  return rebase({}, object, diff)
})

module.exports = patch
