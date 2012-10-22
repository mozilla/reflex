/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

var State = require("../state")
var patch = State.patch
var diff = State.diff

exports["test one"] = function (assert) {
    var s = new State()
    var delta = diff(s)

    assert.deepEqual(s, {}, "initial state")
    assert.equal(JSON.stringify(s), "{}", "patch value 1")
    assert.strictEqual(delta, null, "delta value 1")

    var s2 = patch(s, {
        foo: {
            bar: "baz"
        }
        , foo2: {
            l: "x"
        }
    })
    var delta2 = diff(s2)
    assert.equal(JSON.stringify(delta2), JSON.stringify({
        foo: {
            bar: "baz"
        }
        , foo2: {
            l: "x"
        }
    }), "delta value 2")

    assert.equal(JSON.stringify(s2), JSON.stringify({
        foo: {
            bar: "baz"
        }
        , foo2: {
            l: "x"
        }
    }), "patch value 2")

    var s3 = patch(s2, {
        x: "42"
        , foo: "53"
    })
    var delta3 = diff(s3)

    assert.equal(JSON.stringify(delta3), JSON.stringify({
        x: "42"
        , foo: "53"
    }), "delta value 3")

    assert.equal(JSON.stringify(s3), JSON.stringify({

        foo: "53"
        , foo2: {
            l: "x"
        }
        , x: "42"
    }), "patch value 3")
}

if (module === require.main) {
    require("test").run(exports)
}

