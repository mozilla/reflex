var html = require("unpack-html")
    , remove = require("insert/remove")
    , writer = require("reflex/writer")
    , reactor = require("reflex/reactor")
    , compound = require("compound")
    , map = require("reducers/map")
    , flatten = require("reducers/flatten")
    , events = require("dom-reduce/event")

    , itemHtml = require("./html/item")
    , Submit = require("./lib/submit")

    , deletes = (compound)
        (events, "click")
        (map, function toNull() { return null })
    , ItemWriter = writer(function swap(elements, data) {
        elements.input.value = data.value.text
        elements.text.textContent = data.key
    }, id, function close(elements) {
        remove(elements.root)
    })

module.exports = ItemComponent

function ItemComponent(input, parent) {
    var elements = html(itemHtml)
        , events = flatten([
            deletes(elements.delete)
            , Submit(elements.input, elements.update)
        ])

    ItemWriter(input, elements)

    parent(elements.root)

    return events
}

function id(x) { return x }
