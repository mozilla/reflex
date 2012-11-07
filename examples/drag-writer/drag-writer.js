"use strict";

var writer = require("reflex/writer")
var map = require("reducers/map")
var open = require("dom-reduce/event")
var merge = require("reducers/flatten")
var takeWhile = require("reducers/take-while")
var expand = require("reducers/expand")

// Get a signal of mouse down events.
var mousedown = open(document.documentElement, "mousedown")

// And signals for mouse up and move events.
var mouseup = open(document.documentElement, "mouseup")
var mousemove = open(document.documentElement, "mousemove")

// Relocation signal can be expressed as events from mixed **move** & **up**
// events until firs **up** occurs.
var relocate = takeWhile(merge([ mousemove, mouseup ]), function(event) {
  return event.type !== "mouseup"
})


// Item drag signal can be expressed as expansion of mousedown events
// to a followup relocation events.
var drag = expand(mousedown, function(event) {
  // Calculate offset.
  var offsetX = event.offsetX || event.layerX
  var offsetY = event.offsetY || event.layerY

  // Map relocation events to an axis with offset being applied.
  return map(relocate, function(event) {
    return { x: event.clientX - offsetX, y: event.clientY - offsetY }
  })
})

// Create a writer for a our box element which will
// apply drag axis to it.
var box = writer(function swap(view, state) {
  view.style.left = state.x + "px"
  view.style.top = state.y + "px"
}, function close(view) {
}, function open(options) {
  return document.getElementById("box")
})

// Write drag states into box
box(drag)
