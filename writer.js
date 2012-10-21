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

module.exports = reduce
