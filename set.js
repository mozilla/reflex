var flatten = require("reducers/flatten")
var map = require("reducers/map")
var slice = Array.prototype.slice

module.exports = set

/*
  Turn a list of reacts into a single react function.

  Will call all reacts and merge then outputs
*/
function set() {
  var args = slice.call(arguments)

  return function reactor(changes, options) {
    flatten(map(args, function (react) {
      return react(changes, options)
    }))
  }
}
