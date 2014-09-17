var signal = require("../signal"),
    Input = signal.Input,
    start = signal.start,
    stop = signal.stop,
    receive = signal.receive

var WorkerInput = function(path, events) {
  this.path = path
  this.onMessage = this.onMessage.bind(this, this)
  Input.call(this, events)
}
WorkerInput.prototype = Object.create(Input.prototype)
WorkerInput.prototype.constructor = WorkerInput

WorkerInput.receive = function(target, message, source) {
  target.worker.postMessage(message)
}
WorkerInput.prototype[receive] = WorkerInput.receive

WorkerInput.start = function(target) {
  target.worker = new Worker(target.path)
  target.worker.onmessage = target.onMessage
  Input.start(target)
}
WorkerInput.prototype[start] = WorkerInput.start

WorkerInput.stop = function(target) {
  target.worker.terminate()
  Input.stop(target)
}
WorkerInput.prototype[stop] = WorkerInput.stop

WorkerInput.prototype.onMessage = function(target, event) {
  Input.receive(target, event.data)
}

exports.WorkerInput = WorkerInput

var AppWorker = function(path) {
  this.path = path
}
AppWorker.prototype.input = function(events) {
  return new WorkerInput(this.path, events)
}

exports.AppWorker = AppWorker
