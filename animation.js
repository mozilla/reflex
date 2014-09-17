var Input = require("./signal").Input
var receive = require("./signal").receive
var start = require("./signal").start
var stop = require("./signal").stop

var RequestAnimationFrame = function(window) {
  var past = 0
  return function(callback) {
    var now = new Date().getTime();
    var after = Math.max(0, 16 - (now - past))
    return window.setTimeout(callback, after, past = now + after)
  }
}


var Frames = function(target) {
  var window = target.ownerDocument.defaultView
  this.schedule = window.requestAnimationFrame ||
                  window.mozRequestAnimationFrame ||
                  window.webkitRequestAnimationFrame ||
                  window.msRequestAnimationFrame ||
                  window.oRequestAnimationFrame ||
                  RequestAnimationFrame(window)

  this.abort = window.cancelAnimationFrame ||
               window.mozCancelAnimationFrame ||
               window.webkitCancelAnimationFrame ||
               window.msCancelAnimationFrame ||
               window.oCancelAnimationFrame ||
               window.clearTimeout

  this.stepper = this.step.bind(this, this)
}
Frames.prototype = new Input()
Frames.start = function(frames) {
  var schedule = frames.schedule
  frames.id = schedule(frames.stepper)
}
Frames.stop = function(frames) {
  var abort = frames.abort
  abort(frames.id)
}
Frames.step = function(frames, timeStamp) {
  receive(frames, timeStamp)
  var schedule = frames.schedule
  frames.id = schedule(frames.stepper)
}

Frames.prototype[start] = Frames.start
Frames.prototype[stop] = Frames.stop
Frames.prototype.schedule = Frames.schedule
Frames.prototype.abort = Frames.abort
Frames.prototype.step = Frames.step
exports.Frames = Frames
