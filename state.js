var method = require("method")
var extend = require("xtend")

var diff = method()
var patch = method()

state.diff = diff
state.patch = patch
state.type = State

module.exports = state

function state() { return new State() }

function State() {

}

var diffName = "diff@" + module.id

State.prototype[diffName] = null

diff.define(State, function (state) {
    return state[diffName]
})

/*
    patch(state, {
        itemId: {
            completed: false
        }
        , otherItemId: null
    })

    patch(state, {
        id: otherItemId
        , __deleted__: true
    })
*/

patch.define(State, function (oldState, changes) {
    var base = new State()

    base[diffName] = changes

    return extend(Object.create(base), oldState, changes)
})
