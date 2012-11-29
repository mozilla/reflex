var reflexCollection = require("reflex/collection")
    , merge = require("reducers/merge")
    , extend = require("xtend")

module.exports = collection

/*  parent creates the DOM for the entire collection.

    It returns reducible & view. reducible is returned as a
        result of collection invocation along with the merge
        of all reducibles returned from items created.

    The view is passed to the reflexCollection along with the
        curried input. When reflexCollection asks use to create
        a child for the new key we call open with the key
        and the parentTarget.

    Open then returns reducible & view for the item in the
        collection which is then passed to writer which is the
        schema for each individual item.

    The target is returned from the reflexCollction writer
        because that's the reducible of inputs that the
        item in the collection reads from

*/
function collection(parent, writer, open) {
    return function (input) {
        var parentTarget = parent()

        var output = reflexCollection(function () {
            return function (input, parentTarget, context) {
                var id = context.slice(-1)[0]
                    , target = open(id, parentTarget)

                writer(input, target.view)
                return target
            }
        })(input, parentTarget.view)

        return extend(merge([output, parentTarget]), {
            view: parentTarget.view
        })
    }
}
