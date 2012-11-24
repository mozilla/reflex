var html = require("unpack-html")
    , reduce = require("reducers/reduce")
    , append = require("insert/append")
    , component = require("reflex/component")
    , flatten = require("reducers/flatten")
    , map = require("reducers/map")
    , compound = require("compound")
    , uuid = require("node-uuid")
    , events = require("dom-reduce/event")
    , reactor = require("reflex/reactor")

    , listHtml = require("./html/list")
    , itemHtml = require("./html/item")
    , Submit = require("./lib/submit")
    , render = require("./lib/render")

    , ListItems = (compound)
        (render, {
            "input": {
                "value": "value.text"
            }
            , "text": {
                "textContent": "key"
            }
        })
        (reactor, function read(elements) {
            var deletes = (compound)
                (events, "click")
                (map, function toNull() {
                    return null
                })
                (elements.delete)

            return flatten([
                deletes
                , Submit(elements.input, elements.update)
            ])
        })
        (component)
        (itemHtml)

module.exports = ListComponent

function ListComponent(input, parent) {
    var elements = html(listHtml)
        , newValues = (compound)
            (map, function (value) {
                var hash = {}
                hash["item:" + uuid()] = value
                return hash
            })
            (Submit(elements.text, elements.button))
        , items = ListItems(input, function (view) {
            append(elements.list, view)
        })

    parent(elements.root)

    process.nextTick(function () {
        reduce(newValues, function () {
            elements.text.value = ""
        })
    })

    return flatten([ newValues, items ])
}
