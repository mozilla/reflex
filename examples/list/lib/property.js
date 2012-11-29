var get = require("dotty").get
    , fold = require("reducers/fold")

module.exports = property

function property(name) {
    return function (input, target, context) {
        var path = context.join(".")
            , elem = get(target, path)

        fold(input, function (value) {
            elem[name] = value
        })
    }
}
