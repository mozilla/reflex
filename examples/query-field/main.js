"use strict";

var run = require("reflex/app/runner").run
var AppWorker = require("reflex/app/worker").AppWorker

run(new AppWorker("./app-bundle.js"), document.getElementById("app"))
