/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var method = require("method")

// Method is designed to work with data structures representing application
// state. Calling it with a state should return object representing `delta`
// that has being applied to a previous state to get to a current state.
//
// Example
//
// diff(state) // => { "item-id-1": { title: "some title" } "item-id-2": null }
var diff = method()

module.exports = diff
