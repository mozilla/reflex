"use strict";

var read = require("./listener/read").read
var readers = require("./listener/read").readers
var Input = require("./signal").Input
var receive = require("./signal").receive


var eventTypes = Object.keys(readers);

var findEventTarget = function(event, root) {
  var targetAttribute = "data-reflex-event-" + event.type
  var node = event.target
  while (node !== root &&
         !node.hasAttribute(targetAttribute)) {
    node = node.parentNode
  }
  return node === root ? null : node
}

var listen = function(root) {
  var input = new Input()
  var listener = function(event) {
    var target = findEventTarget(event, root)
    if (target) {
      var path = target.getAttribute("data-reflex-path")
      var message = read(event)
      message.path = path
      message.type = event.type
      receive(input, message)
      return false
    }
  }

  eventTypes.forEach(function(type) {
    root.addEventListener(type, listener, true)
  })

  return input
}
exports.listen = listen
