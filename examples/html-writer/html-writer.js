"use strict";

var writer = require("reflex/writer")
var map = require("reducers/map")
var filter = require("reducers/filter")
var delay = require("reducers/delay")
var open = require("dom-reduce/event")

function html(tagName) {
  return writer(function swap(element, state) {
    element.textContent = state
  }, function open(state) {
    var element = document.createElement(tagName)
    document.documentElement.appendChild(element)
    return element
  }, function close(element) {
    if (element.parentElement)
      element.parentElement.removeChild(element)
  })
}


// Take all keyup events that propagate to the document element.
var keyupEvents = open(document.documentElement, "keyup")
// Filter only to an events on the elements who's type is "text"
var inputChangeEvents = filter(keyupEvents, function(event) {
  return event.target.type === "text"
})
// Map input change events to current values of the input element.
var inputs = map(inputChangeEvents, function(event) {
  return event.target.value
})

// Create `h1` html writer & italic html writer.
var h1 = html("h1")
var h2 = html("h2")
var h3 = html("h3")
var h4 = html("h4")
var h5 = html("h5")
var italic = html("i")

// And write inputs into both of them
h1(inputs)

var offest = 35
h2(delay(inputs, offest * 1))
h3(delay(inputs, offest * 2))
h4(delay(inputs, offest * 3))
h5(delay(inputs, offest * 4))
italic(delay(inputs, offest * 5))
