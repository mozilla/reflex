/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true*/

"use strict";

exports["test state"] = require("./state")
exports["test state diff"] = require("./diff")

if (module === require.main) {
    require("test").run(exports)
}

