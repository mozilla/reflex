"use strict";

var model = require("../../model")
var fold = require("reducers/fold")

var event = require("event")
var send = require("event/send")

var delay = require("reducers/delay")

// Now `property` and `attribute` return things previously known as
// writers! In fact they may use writer abstraction if they desire
// or not it really up to them.

function property(name) {
  return function(input, target, context) {
    var query = [""].concat(context).join(" .")
    var view = target.querySelector(query)
    fold(input, function(value) {
      view[name] = value
    })
  }
}

function attribute(name) {
  return function writeAttribute(input, target, context) {
    var query = [""].concat(context).join(" .")
    var view = target.querySelector(query)
    fold(input, function(value) {
      if (value == void(0)) view.setAttribute(name, value)
      else view.removeAttribute(name)
    })
  }
}

var list = model({
  title: property("textContent"),
  // TODO: Clean up collections as this API is obviously a mess,
  // although idea is good I think. collection will invoke function
  // with input, target, context and will expect normal writer back.
  // Sugar can be added later.
  items: [function(input, target, context) {
    var query = [""].concat(context).join(" .")
    var template = target.querySelector(query)
    var root = template.parentElement
    root.innerHTML = ""
    var write = model({
      name: property("textContent"),
      text: property("value"),
      hidden: attribute("hidden")
    })
    return function(input, target, context) {
      var view = template.cloneNode(true)
      view.id = context.slice(-1).join("")
      write(input, view)
      root.appendChild(view)
    }
  }]
  /*
  items: [{
    name: property("textContent"),
    text: property("value"),
    hidden: attribute("hidden")
  }]
  */
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
