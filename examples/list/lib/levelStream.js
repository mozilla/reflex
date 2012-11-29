var livefeed = require("level-livefeed")
    , streamReduce = require("stream-reduce")
    , map = require("reducers/map")

/* Stream changes from a leveldb range and map them into
    the reflex state model of representing data.
*/
module.exports = LevelStream

function LevelStream(db, options) {
    var stream = livefeed(db, options)

    return map(stream, function (data) {
        var hash = {}
        hash[data.key] = (data.type === "put") ?
            data.value : null
        return hash
    })
}
