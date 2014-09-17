"use strict";

var Input = require("reflex/signal").Input
var onInput = require("reflex/event").onInput
var node = require("reflex/html").node
var eventNode = require("reflex/html").eventNode
var text = require("reflex/html").text
var lift = require("reflex/signal").lift
var foldp = require("reflex/signal").foldp
var app = require("reflex/app").app


var actions = new Input()

var init = { field: "" }

var Actions = {
  NoOp: function() {
    return function(state) {
      return state
    }
  },
  UpdateField: function(text) {
    return function(state) {
      return {field: text}
    }
  }
}


// step : State -> Action -> State
var step = function(state, action) {
  return action(state)
}

var state = foldp(step, init, actions)

var queryField = function(text) {

  return eventNode("input", {
    id: "query-box",
    className: "input-box",
    type: "text",
    value: text
  }, [], [
    onInput(actions, Actions.UpdateField)
  ])
}



var view = function(state) {
  return node("div", {}, [
    queryField(state.field),
    node("div", {className: "mirror"}, [
      text(state.field)
    ])
  ])
}

var main = lift(view, state)
exports.main = main

// Hack: This should not be necessary, worker should set
// this up for us, but for now it's easier than getting
// into worker mess.
app(main)
