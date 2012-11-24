/*global document*/
var leveldb = require("levelidb")
    , livefeed = require("level-livefeed")
    , append = require("insert/append")
    , map = require("reducers/map")
    , reduce = require("reducers/reduce")
    , compound = require("compound")
    , streamReduce = require("stream-reduce")

    , ListComponent = require("./list")

    , db = leveldb("/tmp/reflex/list/example", {
        encoding: "json"
    })

var changes = (compound)
    (map, toHash)
    (ListComponent, function (view) {
        append(document.body, view)
    })
    (map, fromHash)
    (reduce, function updateDatabase(_, value) {
        console.log("inserting", value)
        db.batch([value])
    })
    (livefeed(db, { start: "item:", end: "item;" }))

function fromHash(change) {
    return Object.keys(change).reduce(toBatch, [])

    function toBatch(list, key) {
        var value = change[key]
            , type

        if (value === null) {
            type = "del"
        } else {
            type = "put"
        }

        return { type: type, key: key, value: value }
    }
}

function toHash(data) {
    var hash = {}
    hash[data.key] = data.type === "put" ? data : null
    return hash
}
