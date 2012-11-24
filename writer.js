"use strict";

var reduce = require("reducible/reduce")
var end = require("reducible/end")
var identity = require("functional/identity")

function writer(swap, open, close) {
  /**
  Writer allows you to create write functions that can be passed an `input`
  which it will write. It composes three operations `open` that is supposed
  to open write target and return it back. `swap` that will be invoked every
  time there a new `input` and supposed to apply them to write target and
  `close` invoked once `input` is ended it can be used free / cleanup opened
  target.

  ## Example

      function html(tagName) {
        return writer(function swap(element, state) {
          element.textContent = state
        }, function open(state) {
          return document.createElement(tagName)
        }, function close(element) {
          if (element.parentElement)
            element.parentElement.removeChild(element)
        })
      }
      var h1 = html("h1")
      var input = signal()

      var element = h1(input)
      element.outerHTML // => <h1></h1>

      send(input, "hello")
      element.outerHTML // => <h1>hello</h1>
  **/

  swap = swap || identity
  open = open || identity
  close = close || identity
  return function write(input, options) {
    /**
    Function takes reducible `input` and writes it until `end` is reached.
    Optional `options` could be provided to hint how write target should
    be open / closed. Note it is **important** to pass an error free input
    as writer has no way of handling errors there for it's recommended to
    wrap input in a `capture` function provided by reducers to define error
    recovery strategy. If error still slip through they will propagate to
    a `swap` which may be a desired place to react on in some cases.
    **/
    // Open `output` by calling `open` with provided options.
    var output = open(options)
    // Accumulate input and delegate to `swap` every time there
    // is new `data`. If `data` is `end` then just close an output.
    // TODO: Consider throwing / logging errors instead.
    reduce(input, function accumulateInput(data) {
      return data === end ? close(output, options) :
             swap(output, data)
    })

    return output
  }
}

module.exports = writer
