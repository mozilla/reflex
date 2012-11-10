"use strict";

var test = require("reducers/test/util/test")

var writer = require("../writer")
var reactor = require("../reactor")

var concat = require("reducers/concat")
var delay = require("reducers/delay")


var write = writer(function swap(output, delta) {
  output.push(delta)
}, function open(options) {
  return []
}, function close(output) {
  output.push(null)
})

exports["test reactor"] = test(function(assert) {
  var r = reactor(write, function(output) {
    // Delay output so that writer will have a chance to accumulate inputs.
    return concat(delay("<="), output)
  })
  var actual = r([1, 2, 3])

  assert(actual, ["<=", 1, 2, 3, null], "reactor reads and writes")
})

if (require.main === module)
  require("test").run(exports)
