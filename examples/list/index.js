var leveldb = require("levelidb")
    , model = require("reflex/model")
    , append = require("insert/append")
    , remove = require("insert/remove")
    , map = require("reducers/map")
    , merge = require("reducers/merge")
    , html = require("unpack-html")
    , uuid = require("node-uuid")
    , extend = require("xtend")
    , events = require("dom-reduce/event")
    , prop = require("prop")
    , fold = require("reducers/fold")
    , model = require("reflex/model")

    , Submit = require("./_lib/submit")
    , value = require("./lib/value")
    , updateDatabase = require("./lib/updateDatabase")
    , levelStream = require("./lib/levelStream")
    , textContent = require("./lib/textContent")
    , collection = require("./lib/collection")
    , property = require("./lib/property")
    , listHtml = require("./html/list")
    , itemHtml = require("./html/item")

    // Open database connection
    , db = window.db = leveldb("/tmp/reflex/list/example4", {
        encoding: "json"
    })
    // Stream changes from the database
    , stream = levelStream(db, {
        start: "item:"
        , end: "item;"
    })

// Create a list
var list = List()(stream)

// The list is the stream of changes from that list component
// We want to update the database with those changes
updateDatabase(db, list)

append(document.body, list.view.root)

/* list returns a collection.

    A collection consists of parent, item schema and item open.

    this allows you to create the parent elements for this
        collection along with its inputs and return that as
        a reducible.

    Then collection will call open for each new item which
        is expected to return reducible which will be merged
        into reducible input returned from parent which gets
        returned from collection.

    It also returns view which is passed as target to the schema
        so that the view can be rendered
*/
function List() {
    return collection(function parent() {
        var elements = html(listHtml)

        // Create stream of new values from add item button
        var newValues = map(
            Submit(elements.text, elements.button)
            , function (value) {
                var key = "item:" + uuid()
                    , hash = {}

                hash[key] = {
                    key: key
                    , value: value.text
                }

                elements.text.value = ""

                return hash
            })

        // Contract is reducible with view property
        return extend(newValues, {
            view: elements
        })
    }, model({
        key: textContent
        , value: property("value")
    }), function (key, elements) {
        // Create item target
        var item = html(itemHtml)
            // Read from target
            , deletions =  map(events(item.delete, "click")
                , function () {
                    // collection doesn't handle remove nor
                    // close currently
                    remove(item.root)
                    return null
                })
            , changes = map(
                Submit(item.value, item.update)
                , function (value) {
                    return {
                        key: key
                        , value: value.text
                    }
                })

        append(elements.list, item.root)

        // Contract is to return reducible with a view property
        // kind of sucks.
        return extend(merge([ deletions, changes ]), {
            view: item
        })
    })
}
