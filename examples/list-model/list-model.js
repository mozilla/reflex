"use strict";

var model = require("../../model")
var fold = require("reducers/fold")

var event = require("event")
var send = require("event/send")

var delay = require("reducers/delay")
var hub = require("reducers/hub")

// Now `property` and `attribute` return things previously known as
// writers! In fact they may use writer abstraction if they desire
// or not it really up to them.

function property(name) {
  return function(options) {
    var query = [""].concat(options.context).join(" .")
    var view = options.target.querySelector(query)
    fold(options.input, function(value) {
      view[name] = value
    })
  }
}

function attribute(name) {
  return function writeAttribute(options) {
    var query = [""].concat(options.context).join(" .")
    var view = options.target.querySelector(query)
    fold(options.input, function(value) {
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
  items: [function(options) {
    var query = [""].concat(options.context).join(" .")
    var template = options.target.querySelector(query)
    var root = template.parentElement
    root.innerHTML = ""
    var reactor = model({
      name: property("textContent"),
      text: property("value"),
      hidden: attribute("hidden")
    })
    return function(options) {
      var view = template.cloneNode(true)
      view.id = options.context.slice(-1).join("")
      var output = reactor({ input: options.input, target: view })
      root.appendChild(view)
      return output
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
var output = list({
  input: hub(delay(input, 800)),
  target: document.body
})

fold(output, console.log.bind(console))

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
  title: "Bye there",
  items: {
    "1": {
      name: "Raynos",
      text: "What's up Jake"
    },
    "2": {
      name: "Irakli",
      text: "Hello Irakli"
    }
  }
})
