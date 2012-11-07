"use strict";

var defer = require("eventual/defer")
var deliver = require("eventual/deliver")

function reactor(write, read) {
  /*
  Function produces `reactor` functions responsible for automation of atomic
  entities of the program. It takes `write` function as an argument responsible
  for applying data `inputs` on `entity`. Optional `read` function maybe given
  if interactions on `entity` produces `outputs` of state changes.

  Good example may is widget. Given a `write` function state changes will be
  reflected on widget. Given `read` function will produce signal of user
  interaction events to a widget state changes.

  Self contained reactors could just piped it's `outputs` into `inputs`.
  */

  return function reactor(input, options) {
    /**
    Function is handles automation of atomic `entity` of the program. It takes
    `inputs` and produces `outputs`. Input data is applied to an atomic
    `entity` that reactor is responsible for (in fact it's likely that reactor
    produces entity once invoked). Resulting `outputs` is a signal of state
    changes produced by interactions on the mentioned `entity`.
    **/

    var deferred = defer()
    var entity = write(deferred, options)
    var output = read && read(entity, options)
    deliver(deferred, input || output)
    return output
  }
}

module.exports = reactor
