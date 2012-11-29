var fold = require("reducers/fold")

module.exports = updateDatabase

/*
    Takes a state stream and listens on every incoming change.

    Unpacks the structure into key and value as well as the
        type of operation. When it's a value it's a put, when
        it's null its a del.

    Then apply a batch operation to the database
*/
function updateDatabase(db, stream) {
    fold(stream, function (change) {
        console.log("folding!", change)
        var batch = Object.keys(change).map(toBatch)

        db.batch(batch)

        function toBatch(key) {
            var value = change[key]
                , type

            if (value === null) {
                type = "del"
            } else {
                type = "put"
            }

            return { type: type, key: key, value: value }
        }
    })


}
