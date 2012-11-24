var html = require("unpack-html")
    , reduce = require("reducers/reduce")
    , append = require("insert/append")
    , component = require("reflex/component")
    , flatten = require("reducers/flatten")
    , map = require("reducers/map")
    , compound = require("compound")
    , uuid = require("node-uuid")
    , events = require("dom-reduce/event")
    // reactor feels kind of silly. Maybe component needs to
    // accept both writer and read
    , reactor = require("reflex/reactor")

    , listHtml = require("./html/list")
    , itemHtml = require("./html/item")
    , Submit = require("./lib/submit")
    , render = require("./lib/render")

    , ListItems = (compound)
        // render is nice but it's too niche / restricted
        (render, {
            "input": {
                "value": "value.text"
            }
            , "text": {
                "textContent": "key"
            }
        })
        // Something doesn't feel right about this read function
        (reactor, function read(elements) {
            return flatten([
                map(events(elements.delete, "click"), nil)
                , Submit(elements.input, elements.update)
            ])

            function nil() { return null }
        })
        // this part feels a bit silly. Having a function with
        // no arguments in a compound chain is strange
        (component)
        (itemHtml)

module.exports = ListComponent

function ListComponent(input, parent) {
    var elements = html(listHtml)
        , newValues = (compound)
            // this function is boilerplate bullshit.
            // being able to do
            // return { key: "item:" + uuid(), value: value }
            // is far nicer
            (map, function (value) {
                var hash = {}
                hash["item:" + uuid()] = value
                return hash
            })
            (Submit(elements.text, elements.button))
        , items = ListItems(input, function (view) {
            append(elements.list, view)
        })

    // The parent(view) pattern is annoying, there has to be
    // a better way to do this
    parent(elements.root)

    // This is epic bullshit.
    // Having to be reduce order aware when mutating shared
    // DOM state
    process.nextTick(function () {
        reduce(newValues, function () {
            elements.text.value = ""
        })
    })

    return flatten([ newValues, items ])
}
