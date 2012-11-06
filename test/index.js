"use strict";

exports["test state"] = require("./state")
exports["test writer"] = require("./writer")
exports["test reactor"] = require("./reactor")
exports["test component"] = require("./component")


require("test").run(exports)
