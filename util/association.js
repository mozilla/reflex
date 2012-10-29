"use strict";

function association(id) {
  /**
  High order function that takes `id` and returns function, which when invoked
  will return a hash with given `value` mapped to a curried `id`.
  **/
  function makeAssociation(value) {
    var hash = {}
    hash[id] = value
    return hash
  }
}

module.exports = association
