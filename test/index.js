"use strict";

exports["test state"] = require("./state")

if (module === require.main) {
    require("test").run(exports)
}

