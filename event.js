"use strict";

var signal = require("./signal"),
    Input = signal.Input, start = signal.start,
    stop = signal.stop, end = signal.stop,
    end = signal.end, receive = signal.receive,
    outputs = signal.outputs
var identity = require("functional/identity")


var EventListener = function(type, parse, output, read) {
  this.type = type
  this.output = output
  this.parse = parse
  this.read = read
}
EventListener.prototype = Object.create(Input.prototype)
EventListener.prototype.constructor = EventListener
EventListener.prototype.output = null
EventListener.prototype.type = null
EventListener.prototype.parse = identity
EventListener.prototype.read = identity
EventListener.prototype.handleEvent = function(event) {
  receive(this.output, this.read(this.parse(event)))
}
exports.EventListener = EventListener

function on(type, parse, output, read) {
  return new EventListener(type, parse, output, read)
}
exports.on = on

var When = function(type, p, output, read) {
  this.type = type
  this.output = output
  this.p = p
  this.read = read || this.read
}
When.prototype = Object.create(EventListener.prototype)
When.prototype.constructor = When
When.prototype.handleEvent = function(event) {
  if (this.p(event)) {
    receive(this.output, this.read(this.parse(event)))
  }
}
exports.When = When

function when(type, p, output, read) {
  return new When(type, p, output, read)
}
exports.when = when

var MouseListener = function(type, output, read) {
  this.type = type
  this.output = output
  this.read = read
}
MouseListener.prototype = Object.create(EventListener.prototype)
MouseListener.prototype.constructor = MouseListener
exports.MouseListener = MouseListener

var onMouseEvent = function(type) {
  return function(handle, read) {
    return new MouseListener(type, handle, read)
  }
}

exports.onClick = onMouseEvent("click")
exports.onDoubleClick = onMouseEvent("dblclick")
exports.onMouseMove = onMouseEvent("mousemove")
exports.onMouseDown = onMouseEvent("mousedown")
exports.onMouseUp = onMouseEvent("mouseup")
exports.onMouseEnter = onMouseEvent("mouseenter")
exports.onMouseLeave = onMouseEvent("mouseleave")
exports.onMouseOver = onMouseEvent("mouseover")
exports.onMouseOut = onMouseEvent("mouseout")

var KeyboardListener = function(type, output, read) {
  this.type = type
  this.output = output
  this.read = read
}
KeyboardListener.prototype = Object.create(EventListener.prototype)
KeyboardListener.prototype.constructor = KeyboardListener
exports.KeyboardListener = KeyboardListener

var onKeyboardEvent = function(type) {
  return function(handle, read) {
    return new KeyboardListener(type, handle, read)
  }
}

exports.onKeyUp = onKeyboardEvent("keyup")
exports.onKeyDown = onKeyboardEvent("keydown")
exports.onKeyPress = onKeyboardEvent("keypress")

var SimpleEventListener = function(type, output, value) {
  this.type = type
  this.output = output
  this.value = value
}
SimpleEventListener.prototype = Object.create(EventListener.prototype)
SimpleEventListener.prototype.constructor = SimpleEventListener
SimpleEventListener.prototype.handleEvent = function(event) {
  receive(this.output, this.value)
}
exports.SimpleEventListener = SimpleEventListener

var onSimpleEvent = function(type) {
  return function(handle, value) {
    return new SimpleEventListener(type, handle, value)
  }
}

exports.onBlur = onSimpleEvent("blur")
exports.onFocus = onSimpleEvent("focus")
exports.onSubmit = onSimpleEvent("submit")

var InputEventListener = function(output, read) {
  this.output = output
  this.read = read
}
InputEventListener.prototype = Object.create(EventListener.prototype)
InputEventListener.prototype.constructor = InputEventListener
InputEventListener.prototype.type = "input"
InputEventListener.prototype.parse = function(event) {
  return event.value
}


var onInput = function(handle, read) {
  return new InputEventListener(handle, read)
}
exports.onInput = onInput
