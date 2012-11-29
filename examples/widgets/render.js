"use strict";

var method = require("method")
var util = require("util")


// Render function takes arbitrary data structure and returns something
// that can visually represent it.
var render = method("render")

render.define(function(value) {
  return util.inspect(value)
})

render.define(Error, function(error) {
  return String(error)
})

render.define(Element, function(element) {
  return element
})

module.exports = render
