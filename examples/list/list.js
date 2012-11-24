var html = require("unpack-html")
    , reduce = require("reducers/reduce")
    , append = require("insert/append")
    , component = require("reflex/component")
    , flatten = require("reducers/flatten")
    , map = require("reducers/map")
    , compound = require("compound")
    , uuid = require("node-uuid")

    , listHtml = require("./html/list")
    , ListItem = require("./item")
    , Submit = require("./lib/submit")

    , ListItems = component(ListItem)
    , newValues = (compound)
        (map, function (value) {
            var hash = {}
            hash["item:" + uuid()] = value
            return hash
        })

module.exports = ListComponent

function ListComponent(input, parent) {
    var elements = html(listHtml)
        , list = elements.list
        , events = flatten([
            newValues(Submit(elements.text, elements.button))
            , ListItems(input, function (view) {
                append(list, view)
            })
        ])

    parent(elements.root)

    process.nextTick(function () {
        reduce(newValues, function () {
            elements.text.value = ""
        })
    })

    return events
}
