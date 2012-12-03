"use strict";

var model = require("reflex/model")
var collection = require("reflex/collection")
var state = require("reflex/state")


var event = require("event")
var send = require("event/send")
var pipe = require("event/pipe")

var delay = require("reducers/delay")
var hub = require("reducers/hub")

var fold = require("reducers/fold")
var merge = require("reducers/merge")
var reductions = require("reducers/reductions")
var map = require("reducers/map")
var filter = require("reducers/filter")

var print = require("reducers/debug/print")

var patch = require("diffpatcher/patch")

var values = require("oops/values")
var field = require("oops/field")
var is = require("oops/is")
var dictionary = require("oops/dictionary")

var open = require("dom-reduce/event")

var compose = require("functional/compose")
var identity = require("functional/identity")

var changes = hub(open(document.documentElement, "change"))
var keyup = hub(open(document.documentElement, "keyup"))
var clicks = hub(open(document.documentElement, "click"))

var enter = filter(keyup, function(event) { return event.keyCode === 13 })

var newItems = filter(enter, function(event) {
  return event.target.id === "new-todo"
})
var newTasks = map(newItems, function(event) {
  return dictionary(Date.now().toString(32), { text: event.target.value })
})
var additions = map(newTasks, dictionary("task"))

function complete(options) {
  var view = select(options.target, options.context)
  var targets = map(changes, field("target"))
  var toogles = filter(targets, is(view))
  return map(toogles, field("checked"))
}

function content(options) {
  return null
}

function select(target, context) {
  var query = [""].concat(context).join(" .")
  return target.querySelector(query)
}

function property(name) {
  return function(options) {
    var view = select(options.target, options.context)
    fold(options.input, function(value) {
      view[name] = value
    })
    return options
  }
}

function attribute(name) {
  return function writeAttribute(options) {
    var view = select(options.target, options.context)
    fold(options.input, function(value) {
      if (value == void(0)) view.setAttribute(name, value)
      else view.removeAttribute(name)
    })
    return options
  }
}

function readDelete(view) {
  var button = select(view, ["destroy"])
  var targets = map(clicks, field("target"))
  var deletes = filter(targets, is(button))
  var id = view.id
  return map(deletes, function() { return null })
}

var task = model({
  complete: compose(complete, property("checked"), function(options) {
    var target = options.target
    fold(options.input, function(complete) {
      if (complete) target.classList.add("completed")
      else target.classList.remove("completed")
    })
    return options
  }),
  text: compose(content, property("textContent"))
})

var tasks = model({
  task: [function reactor(options) {
    var template = select(options.target, options.context)
    var root = template.parentElement
    root.innerHTML = ""
    return function reactor(options) {
      var view = template.cloneNode(true)
      view.id = options.context.slice(-1).pop()
      var updates = task({ input: options.input, target: view })
      var deletes = readDelete(view)
      // TODO: This is really ugly I think we need something like
      // merge([ takeUntil(updates, deleted), deleted ])
      // and maybe collection can have a function that is invoked once
      // output is ended, that's where element could be deleted.
      fold(deletes, function() {
        root.removeChild(view)
      })
      root.appendChild(view)
      return merge([ updates, deletes ])
    }
  }],
  status: {
    // TODO: Compose for ignoring return value of property really sucks!
    pending: compose(content, property("textContent")),
    complete: compose(content, property("textContent"))
  }
})

function status(input) {
  return reductions(input, function(state, delta) {
    state = patch(state, delta)
    var tasks = values(state.task)
    var complete = tasks.filter(Boolean).map(field("complete")).filter(Boolean).length
    var pending = tasks.length - complete
    state.status = { complete: complete, pending: pending }
    return state
  }, state())
}

var input = event()
// TODO: Using events just to include output into inputs really sucks!
// Maybe `options.inputs` could be added in which case own output will
// be added to the other inputs to form combined input. Also this solves
// very tricky behavior of nothing happening until output is being consumed
// maybe output should always be merged with input ?
var updates = tasks({
  input: status(hub(input)),
  target: document.body
})

var output = merge([
  updates, additions, JSON.parse(localStorage.app || "{}")
])
pipe(output, input)

fold(output, function(delta, state) {
  state = patch(state, delta)
  localStorage.app = JSON.stringify(state)
  console.log(state)
  return state
}, state())


// TODO: This here is pretty ugly and stupid.
fold(newItems, function(event) {
  event.target.value = ""
})
