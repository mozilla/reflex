"use strict";

var fold = require("reducers/fold")

function atom(write, name) {
  /**
  Takes `write` function and uses it to write changes from `input`
  into `target` element in the target that has "data-field" with
  a `name` value. This just carries `write` & `name` and returns
  function that will take `input` and `target` and will actually do
  the writing.
  **/

  return function(input, target) {
    fold(input, function(value) {
      var view = target.querySelector("[data-field='" + name + "']")
      write(view, value)
    })
  }
}

module.exports = atom
