"use strict";

function field(name) {
  /**
  High order function that returns accessor function for the attribute
  with a given name. Resulting function will take an object and will return
  value associated with that field.
  **/
  return function fieldValue(hash) {
    return hash[name]
  }
}

module.exports = field
