var compound = require("compound")
    , map = require("reducers/map")
    , filter = require("reducers/filter")
    , flatten = require("reducers/flatten")
    , expand = require("reducers/expand")
    , events = require("dom-reduce/event")

    , ENTER = 13

module.exports = Submit

function Submit(inputs, button) {
    if (!Array.isArray(inputs)) {
        inputs = [inputs]
    }

    return flatten([
        changes(inputs)
        , updates(inputs, button)
    ])
}

function changes(inputs) {
    return expand(inputs, function (input) {
        return (compound)
            (events, "keypress")
            (filter, isEnter)
            (filter, Boolean)
            (map, function value() {
                var hash = {}
                hash[input.name] = input.value
                return hash
            })
            (input)
    })
}

function updates(inputs, button) {
    return (compound)
        (events, "click")
        (map, function () {
            return inputs.reduce(function (hash, input) {
                hash[input.name] = input.value
                return hash
            }, {})
        })
        (button)
}

function isEnter(event) {
    return event.keyCode === ENTER
}
