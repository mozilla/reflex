/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var open = require('reducers/dom').open
var compound = require("compound")
var hub = require('reducers/hub')
var core = require('reducers/core'),
    filter = core.filter,
    map = core.map,
    reductions = core.reductions

var reduce = require("reducers/accumulator").reduce
var channel = require("reducers/channel")
var enqueue = channel.enqueue



function writer(swap, close, open) {
  return function write(input, output) {
    output = output || open()
    reduce(input, function(state, update) {
      if (update === null) close(output)
      else swap(output, update)
      return update
    })
    return output
  }
}


