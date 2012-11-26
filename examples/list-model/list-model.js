"use strict";

var model = require("reflex/model")

var event = require("event")
var send = require("event/send")

var delay = require("reducers/delay")

function property(name) {
  return function(target, value) {
    target[name] = value
  }
}

function attribute(name) {
  return function writeAttribute(view, value) {
    if (value == void(0)) view.setAttribute(name, value)
    else view.removeAttribute(name)
  }
}

var list = model({
  title: property("textContent"),
  items: [{
    name: property("textContent"),
    text: property("value"),
    hidden: attribute("hidden")
  }]
})


var input = event()
list(delay(input, 800), document.body)

send(input, {
  title: "Hello there!",
  items: {
    "1": {
      name: "Jake",
      text: "Hello Jake"
    }
  }
})

send(input, {
  items: {
    "2": {
      name: "Irakli",
      text: "Hello Irakli"
    }
  }
})
