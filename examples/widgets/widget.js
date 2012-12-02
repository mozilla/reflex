"use strict";

var event = require("event")
var send = require("event/send")
var fold = require("reducers/fold")
var render = require("interactivate/render")


function Widget(model, input, open, swap) {
  this.model = model
  this.input = input
  this.open = open
  this.swap = swap
}
render.define(Widget, function(widget) {
  var view = widget.open(widget.model)
  fold(widget.input, function(state) {
    widget.swap(state, view)
  })
  return view
})

function widget(open, swap) {
  return function (model, input) {
    return new Widget(model, input, open, swap)
  }
}

module.exports = widget
