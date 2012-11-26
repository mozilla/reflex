"use strict";

var state = require("./state")

var patch = require("diffpatcher/patch")

var hub = require("reducers/hub")
var fold = require("reducers/fold")
var concat = require("reducers/concat")
var filter = require("reducers/filter")
var map = require("reducers/map")
var takeWhile = require("reducers/take-while")

var has = require("oops/has")
var field = require("oops/field")
var isnt = require("oops/isnt")

function collection(write, name) {
  return function(input, target) {
    var template = target.querySelector("[data-field='" + name + "']")
    var root = template.parentNode
    root.innerHTML = ""

    input = hub(input)
    fold(input, function(delta, state) {
      Object.keys(delta).map(function(id) {
        if (state[id] === void(0)) {
          var view = template.cloneNode(true)
          var fork = concat(delta, input)
          var changes = filter(fork, has(id))
          var updates = map(changes, field(id))
          write(takeWhile(updates, isnt(null)), view)

          // TODO: Instead of just appending `view` there should
          // be a function that decides whether to append / prepend
          // `view` or maybe even rearrange them to do sorting.
          root.appendChild(view)
        }
      })
      return patch(state, delta)
    }, state())
  }
}

module.exports = collection
