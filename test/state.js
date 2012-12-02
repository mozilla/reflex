"use strict";

var state = require("../state")
var patch = require("diffpatcher/patch")
var diff = require("diffpatcher/diff")

// Utility that resets prototype of hash back to Object.prototype
function reset(hash) { return JSON.parse(JSON.stringify(hash)) }


exports["test one"] = function (assert) {
  var s1 = state()

  assert.equal(diff(null, s1), s1, "diff for for initial state is itself")
  assert.deepEqual(reset(s1), {}, "initial state is empty hash")

  var delta1 = {
    foo: { bar: "baz" },
    foo2: { l: "x" }
  }
  var s2 = patch(s1, delta1)

  assert.equal(diff(s1, s2), delta1, "diff returns delta applied to previous state")
  assert.deepEqual(reset(s2), {
    foo: { bar: "baz" },
    foo2: { l: "x" }
  }, "first patch was applied properly")

  var delta2 = { x: "42", foo: { baz: "bar" } }

  var s3 = patch(s2, delta2)

  assert.equal(diff(s2, s3), delta2, "diff returns delta applied to previous state")
  assert.deepEqual(reset(s3), {
      foo: { bar: "baz", baz: "bar" },
      foo2: { l: "x" },
      x: "42"
  }, "nested changes applied properly")
}

if (require.main === module)
  require("test").run(exports)
