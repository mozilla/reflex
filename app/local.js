var signal = require("../signal"),
    Input = signal.Input,
    start = signal.start,
    stop = signal.stop,
    receive = signal.receive
var diff = require("../html").diff


var LocalAppInput = function(main, events) {
  this.main = main
  this.events = events
  Merge.call(this, [main, events])
}
LocalAppInput.prototype = Object.create(Merge.prototype)
LocalAppInput.prototype.constructor = LocalAppInput
LocalAppInput.receive = function(app, data, source) {
  if (source === app.events)
    LocalAppInput.prototype.receiveEvent(app, data)
  if (source === app.main)
    Input.receive(app, app.value ? diff(app.value, data) : data)
}
LocalAppInput.prototype[receive] = LocalAppInput.receive

LocalAppInput.prototype.receiveEvent = function(app, event) {
  var node = select(event.path, app.value)
  node.handleEvent(event)
}

var AppLocal = function(main) {
  this.main = main
}
AppLocal.prototype.input = function(events) {
  return new LocalAppInput(main, events)
}
