/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var reduce = require("reducers/reduce")

function writer(swap, close, open) {
  /**
  Writer allows you to create write functions like this one:
  function html(tagName) {
    return writer(function swap(element, state) {
      element.textContent = state
    }, function close(element) {
      if (element.parentElement)
      element.parentElement.removeChild(element)
    }, function open(state) {
      return document.createElement(tagName)
    })
  }
  var h1 = html("h1")
  var input = channel()

  var element = h1(input)
  element.outerHTML // => <h1></h1>

  enqueue(channel, "hello")
  element.outerHTML // => <h1>hello</h1>
  **/

  return function write(input, options) {
    var output = open(options)
    var result = reduce(input, function(state, update) {
      swap(output, update)
      return update
    })
    // Once reduction of input is complete close. `reduce` always returns
    // value equivalent of sequence with a sequence of single value representing
    // result of accumulation.
    reduce(result, function() { close(output, options) })
    return output
  }
}

module.exports = writer
