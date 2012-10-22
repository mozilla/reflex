/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var state = require("../state")
var patch = require("../state/patch")
var diff = require("../state/diff")

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
