;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var reflex = require("../../reflex");

// Arguments reperesent cells (like in spreadsheet) that user may change. We can
// define derived cells that react to changes on cells they derived from and change
// as well.
var main = reflex(function(loan, down, price, interest, tax, hazard, other) {
  var due = reflex.lift(function(loan) {
    return loan * 12;
  }, loan);

  var downAmount = reflex.lift(function(price, down) {
    return price * down / 100;
  }, price, down);

  var loanAmount = reflex.lift(function(price, downAmount) {
    return price - downAmount;
  }, price, downAmount);

  var monthlyMortgage = reflex.lift(function(loan, interest, due) {
    return Math.round(loan * interest / (1 - (Math.pow(1 / (1 + interest), due))));
  }, loanAmount, interest, due);

  var estateTax = reflex.lift(function(tax) {
    return Math.round(tax / 12);
  }, tax);

  var sum = function() {
    var total = 0;
    var index = 0;
    while (index < arguments.length) {
      total = total + arguments[index];
      index = index + 1;
    }
    return total;
  };
  var totalMonthly = reflex.lift(sum, hazard, other, estateTax, monthlyMortgage);

  // Finally we return record of named cells. Changes on either one of them going to be reflected
  // on the rendering target. Name of the cell is assumed to be mapped to an id of the element it
  // is bound to.
  this.loan = loan;
  this.down = down;
  this.price = price;
  this.interest = interest;
  this.tax = tax;
  this.hazardInsurance = hazard;
  this.otherFinancing = other;
  this.due = due;
  this.downAmount = downAmount;
  this.loanAmount = loanAmount;
  this.monthlyMortgage = monthlyMortgage;
  this.estateTax = estateTax;
  this.totalMonthly = totalMonthly;
});

window.onload = function() {
  main.render(document.documentElement);
}



},{"../../reflex":2}],2:[function(require,module,exports){
"use strict";

var signal = require("./signal");
var Input = signal.Input,
    start = signal.start,
    receive = signal.receive,
    merge = signal.merge,
    lift = signal.lift,
    source = signal.source,
    merges = signal.merges;

// Signal that given `target` element and hash of `outputs` signals
// will dispatch to an output from hash that is mapped to
// `event.type + "/" + event.target.id`. If such output is found
// received value will be send to it.
// Note: Right now it only deals with `change` events but likely in
// future it's going be to extended to add support for more event
// types.
var EventBus = function(outputs, target) {
  this.outputs = outputs;
  this.target = target;
  Input.call(this);
};
EventBus.start = function(bus) {
  bus.target.addEventListener("change", function(event) {
    receive(bus, event);
  });
  Object.keys(bus.outputs).forEach(function(address) {
    var output = bus.outputs[address];
    var source = bus.target.ownerDocument.getElementById(output.id);
    output.value = source && source.value;
  });
};
EventBus.receive = function(bus, event) {
  var target = event.target;
  var type = event.type;
  var address = type + "/" + target.id;
  var output = bus.outputs[address];
  if (output instanceof Cell) {
    receive(output, event);
  }
};
EventBus.prototype = new Input();
EventBus.prototype.constructor = EventBus;
EventBus.prototype[start] = EventBus.start;
EventBus.prototype[receive] = EventBus.receive;

// Signal that represents input given to `Reflex` initializer.
// It basically represents last state of the input declared in
// the reflex.
var Cell = function() {
  Input.call(this);
};
Cell.start = function() {};
Cell.receive = function(cell, event) {
  Input.receive(cell, event.target.value);
};
Cell.prototype = new Input();
Cell.prototype.constructor = Cell;
Cell.prototype[start] = Cell.start;
Cell.prototype[receive] = Cell.receive;
Cell.prototype.type = "change";

// Signal constructor takes `id` and `source` signal and returns
// signal that will receive value of the source in form of hash
// where `value` is mapped to `id`. Reflex joins all outputs using
// this, to produce changes that are structured same as hash returned
// by an initializer.
var
Writer = function(id, source) {
  this.id = id;
  Input.call(this, source);
};
Writer.prototype = new Input();
Writer.prototype.constructor = Writer;
Writer.receive = function(writer, value) {
  var record = {};
  record[writer.id] = value;
  Input.receive(writer, record);
};
Writer.prototype[receive] = Writer.receive;

// Signal constructor takes `target` element where changes will be
// rendered and an `input` signal containing those changes. Keys in
// the change are assumed to be child element id's of the target.
// If element for the change is found new state is going to be rendered
// in it.
function Renderer(source, target) {
  this.target = target;
  Input.call(this, source);
}
Renderer.prototype = new Input();
Renderer.prototype.constructor = Renderer;
Renderer.receive = function(renderer, delta) {
  Object.keys(delta).forEach(function(id) {
    var target = renderer.target.ownerDocument.getElementById(id);
    if (target) {
      if (target.tagName.toLowerCase() === "input") {
        target.value = delta[id];
      }
      else {
        target.textContent = delta[id];
      }
    }
  });
};
Renderer.prototype[receive] = Renderer.receive;


// Reflex constructs a signal out of initializer which is expected
// to return all the ports who's changes should be reflected in the
// document. Signal on it's own is not very useful as signal although
// Reflex instance has a `render` method, which can be invoked with
// a `target` element. That initiates a render loop with in that
// element. Changes on input cells will be reflected on output cells
// by renderig updates with in them.
var Reflex = function(initializer) {
  if (!(this instanceof Reflex))
    return new Reflex(initializer);

  var cells = [];
  while (cells.length < initializer.length) {
    cells.push(new Cell());
  }


  var ports = Object.create(initializer.prototype);
  ports = initializer.apply(ports, cells) || ports;
  var names = Object.keys(ports);
  var inputs = names.reduce(function(inputs, id) {
    var port = ports[id];
    if (port instanceof Cell) {
      id = port.id || id;
      inputs[port.type + "/" + id] = port;
      port.id = id;
    }
    return inputs;
  }, Object.create(null));
  var outputs = names.map(function(id) { return new Writer(id, ports[id]); });

  this.inputs = inputs;
  this.outputs = outputs;

  Input.call(this, merges(outputs));
};
Reflex.prototype = new Input();
Reflex.render = function(reflex, target) {
  var eventBus = new EventBus(reflex.inputs, target);
  var renderer = new Renderer(reflex, target);
  start(eventBus);
  start(renderer);
};
Reflex.prototype.constructor = Reflex;
Reflex.prototype.render = function(target) {
  Reflex.render(this, target);
};
Reflex.lift = signal.lift;
Reflex.map = signal.map;
Reflex.constant = signal.constant;
Reflex.merge = signal.merge;
Reflex.merges = signal.merges;
Reflex.combine = signal.combine;
Reflex.count = signal.count;
Reflex.countIf = signal.countIf;
Reflex.keepIf = signal.keepIf;
Reflex.dropIf = signal.dropIf;
Reflex.keepWhen = signal.keepWhen;
Reflex.dropWhen = signal.dropWhen;
Reflex.dropRepeats = signal.dropRepeats;
Reflex.sampleOn = signal.sampleOn;


module.exports = Reflex;

},{"./signal":3}],3:[function(require,module,exports){
"use strict";


// The library for general signal manipulation. Includes `lift` function
// (that supports up to 8 inputs), combinations, filters, and past-dependence.
//
// Signals are time-varying values. Lifted functions are reevaluated whenver
// any of their input signals has an event. Signal events may be of the same
// value as the previous value of the signal. Such signals are useful for
// timing and past-dependence.
//
// Some useful functions for working with time (e.g. setting FPS) and combining
// signals and time (e.g. delaying updates, getting timestamps) can be found in
// the Time library.
//
// Module implements elm API: http://docs.elm-lang.org/library/Signal.elm


var $source = "source@signal"
var $sources = "sources@signal"
var $outputs = "outputs@signal"
var $connect = "connect@signal"
var $disconnect = "disconnect@signal"
var $receive = "receive@signal"
var $error = "error@signal"
var $end = "end@signal"
var $start = "start@signal"
var $stop = "stop@signal"
var $state = "state@signal"
var $pending = "pending@signal"

function outputs(input) { return input[$outputs] }
outputs.toString = function() { return $outputs }
exports.outputs = outputs

function start(input) { input[$start](input) }
start.toString = function() { return $start }
exports.start = start

function stop(input) { input[$stop](input) }
stop.toString = function() { return $stop }
exports.stop = stop

function connect(source, target) { source[$connect](source, target) }
connect.toString = function() { return $connect }
exports.connect = connect

function disconnect(source, target) { source[$disconnect](source, target) }
disconnect.toString = function() { return $disconnect }
exports.disconnect = disconnect

function receive(input, message) { input[$receive](input, message) }
receive.toString = function() { return $receive }
exports.receive = receive

function error(input, message) { input[$error](input, message) }
error.toString = function() { return $error }
exports.error = error

function end(input) { input[$end](input) }
end.toString = function() { return $end }
exports.end = end

function stringify(input) {
  return input.name + "[" + (input[$outputs] || []).map(function(x) { return x.name }) + "]"
}

var stringifier = Object.prototype.toString
function isError(message) {
  return stringifier.call(message) === "[object Error]"
}

function Return(value) {
  if (!(this instanceof Return))
    return new Return(value)

  this.value = value
}
exports.Return = Return

function send(input, message) {
  if (message instanceof Return) {
    input[$receive](input, message.value)
    input[$end](input)
  }
  else if (isError(message)) {
    input[$error](input, message)
  }
  else {
    input[$receive](input, message)
  }
}
exports.send = send

function Break() {}
exports.Break = Break


function Input(source) {
  this[$source] = source;
  this[$outputs] = [];
}
exports.Input = Input


// `Input.start` is invoked with an `input` whenever system is
// ready to start receiving values. After this point `input` can
// start sending messages. Generic behavior is to `connect` to
// the `input[$source]` to start receiving messages.
Input.start = function(input) {
  var source = input[$source]
  source[$connect](source, input)
}

// `Input.stop` is invoked with an `input` whenever it needs to
// stop. After this point `input` should stop sending messages.
// Generic `Input` behavior is to `disconnect` from the
// `input[$source]` so no more `messages` will be received.
Input.stop = function(input) {
  var source = input[$source]
  source[$disconnect](source, input)
}

// `Input.connect` is invoked with `input` and `output`. This
// implementation put's `output` to it's `$output` ports to
// delegate received `messages` to it.
Input.connect = function(input, output) {
  var outputs = input[$outputs]
  if (outputs.indexOf(output) < 0) {
    outputs.push(output)
    if (outputs.length === 1)
      input[$start](input)
  }
}

// `Input.disconnect` is invoked with `input` and an `output`
// connected to it. After this point `output` should not longer
// receive messages from the `input`. If it's a last `output`
// `input` will be stopped.
Input.disconnect = function(input, output) {
  var outputs = input[$outputs]
  var index = outputs.indexOf(output)
  if (index >= 0) {
    outputs.splice(index, 1)
    if (outputs.length === 0)
      input[$stop](input)
  }
}

// `Input.Port` creates a message receiver port. `Input` instances support
// `message`, `error`, `end` ports.
Input.Port = function(port) {
  var isError = port === $error
  var isEnd = port === $end
  var isMessage = port === $receive

  // Function will write `message` to a given `input`. This means
  // it will delegeate messages to it's `input[$outputs]` ports.
  return function write(input, message) {
    var outputs = input[$outputs]
    var result = void(0)
    var count = outputs.length
    var index = 0

    // Note: dispatch loop decreases count or increases index as needed.
    // This makes sure that new connections will not receive messages
    // until next dispatch loop & intentionally so.
    while (index < outputs.length) {
      // Attempt to send a value to a connected `output`. If this is
      // `$end` `port` return `Break` to cause `output` to be
      // disconnected. If any other `port` just deliver a `message`.
      var output = outputs[index]
      try {
        result = isEnd ? output[port](output, input) :
                 output[port](output, message, input)
      }
      catch (reason) {
        throw reason
        // If exception was thrown and `message` was send to `$error`
        // `port` give up and log error.
        if (isError) {
          console.error("Failed to receive an error message",
                        message,
                        reason)
        }
        // If exception was thrown when writing to a different `port`
        // attempt to write to an `$error` `port` of the `output`.
        else {
          try {
            result = output[$error](output, reason, input)
          }
          // If exception is still thrown when writing to an `$error`
          // `port` give up and log `error`.
          catch (error) {
            console.error("Failed to receive message & an error",
                          message,
                          reason,
                          error);
          }
        }
      }

      // If result of sending `message` to an `output` was instance
      // of `Break`, disconnect that `output` so it no longer get's
      // messages. Note `index` is decremented as disconnect will
      // remove it from `outputs`.
      if (result instanceof Break || isEnd) {
        input[$disconnect](input, output)
      }
      // On any other `result` just move to a next output.
      else {
        index = index + 1
      }
    }

    // Once message was written to all outputs update `value` of
    // the input.
    if (isMessage)
      input.value = message

    if (count === 0 && isEnd)
      input[$stop](input)
  }
}

// Inputs have `message`, `error` and `end` ports
Input.receive = Input.Port($receive)
Input.error = Input.Port($error)
Input.end = Input.Port($end)

// Same API functions are saved in the prototype in order to enable
// polymorphic dispatch.
Input.prototype[$start] = Input.start
Input.prototype[$stop] = Input.stop
Input.prototype[$connect] = Input.connect
Input.prototype[$disconnect] = Input.disconnect
Input.prototype[$receive] = Input.receive
Input.prototype[$error] = Input.error
Input.prototype[$end] = Input.end
Input.prototype.toJSON = function() {
  return { value: this.value }
}

function Constant(value) {
  this.value = value
}
Constant.ignore = function() {}

Constant.prototype = new Input()
Constant.prototype.constructor = Constant
Constant.prototype[$start] = Constant.ignore
Constant.prototype[$stop] = Constant.ignore
Constant.prototype[$connect] = Constant.ignore
Constant.prototype[$disconnect] = Constant.ignore
Constant.prototype[$receive] = Constant.ignore
Constant.prototype[$error] = Constant.ignore
Constant.prototype[$end] = Constant.ignore


// Create a constant signal that never changes.

// a -> Signal a

function constant(value) {
  return new Constant(value)
}
exports.constant = constant


function Merge(inputs) {
  this[$outputs] = []
  this[$sources] = inputs
  this[$pending] = inputs.length
  this.value = inputs[0].value
}
Merge.start = function(input) {
  var sources = input[$sources]
  var count = sources.length
  var id = 0

  while (id < count) {
    var source = sources[id]
    source[$connect](source, input)
    id = id + 1
  }
}
Merge.stop = function(input) {
  var inputs = input[$sources]
  var count = inputs.length
  var id = 0
  while (id < count) {
    var source = inputs[id]
    source[$disconnect](source, input)
    id = id + 1
  }
}
Merge.end = function(input, source) {
  var sources = input[$sources]
  var id = sources.indexOf(source)
  if (id >= 0) {
    var pending = input[$pending] - 1
    input[$pending] = pending
    source[$disconnect](source, input)

    if (pending === 0)
      Input.end(input)
  }
}

Merge.prototype = new Input()
Merge.prototype.constructor = Merge
Merge.prototype[$start] = Merge.start
Merge.prototype[$stop] = Merge.stop
Merge.prototype[$end] = Merge.end

// Merge two signals into one, biased towards the
// first signal if both signals update at the same time.

// Signal x -> Signal y -> ... -> Signal z
function merge() {
  return new Merge(slicer.call(arguments, 0))
}
exports.merge = merge


// Merge many signals into one, biased towards the
// left-most signal if multiple signals update simultaneously.
function merges(inputs) {
  return new Merge(inputs)
}
exports.merges = merges


// # Past-Dependence

// Create a past-dependent signal. Each value given on the input signal
// will be accumulated, producing a new output value.

function FoldP(step, value, input) {
  this[$outputs] = []
  this[$source] = input
  this.value = value
  this.step = step
}
FoldP.receive = function(input, message, source) {
  Input.receive(input, input.step(input.value, message))
}

FoldP.prototype = new Input()
FoldP.prototype.constructor = FoldP
FoldP.prototype[$receive] = FoldP.receive


function foldp(step, x, xs) {
  return new FoldP(step, x, xs)
}
exports.foldp = foldp


// Optimized version that tracks single input.
function Lift(step, input) {
  this.step = step
  this[$source] = input
  this[$outputs] = []
  this.value = step(input.value)
}
Lift.receive = function(input, message) {
  Input.receive(input, input.step(message))
}

Lift.prototype = new Input()
Lift.prototype.constructor = Lift
Lift.prototype[$receive] = Lift.receive

function LiftN(step, inputs) {
  var count = inputs.length
  var id = 0
  var params = Array(count)
  while (id < count) {
    var input = inputs[id]
    params[id] = input.value
    id = id + 1
  }
  var value = step.apply(step, params)

  this.step = step
  this[$outputs] = []
  this[$sources] = inputs
  this[$pending] = inputs.length
  this[$state] = params
  this.value = value
}
LiftN.start = Merge.start
LiftN.stop = Merge.stop
LiftN.end = Merge.end


LiftN.receive = function(input, message, source) {
  var params = input[$state]
  var index = input[$sources].indexOf(source)
  var step = input.step
  params[index] = message
  return Input.receive(input, step.apply(step, params))
}

LiftN.prototype = new Input()
LiftN.prototype.constructor = LiftN
LiftN.prototype[$start] = LiftN.start
LiftN.prototype[$stop] = LiftN.stop
LiftN.prototype[$end] = LiftN.end
LiftN.prototype[$receive] = LiftN.receive

var slicer = [].slice

// Transform given signal(s) with a given `step` function.

// (x -> y -> ...) -> Signal x -> Signal y -> ... -> Signal z
//
// xs              :--x-----x-----x---
// lift(f, xs)     :--f(x)--f(x)--f(x)
//
// xs              :--x--------------------------x-------
// ys              :-----------y---------y---------------
// lift(f, xs, ys) :--f(x, y)--f(x, y)--f(x, y)--f(x, y)-
function lift(step, xs, ys) {
  return ys ? new LiftN(step, slicer.call(arguments, 1)) :
         new Lift(step, xs)
}
exports.lift = lift
exports.lift2 = lift
exports.lift3 = lift
exports.lift4 = lift
exports.lift5 = lift
exports.lift6 = lift
exports.lift7 = lift
exports.lift8 = lift
exports.liftN = lift


// Combine a array of signals into a signal of arrays.
function combine(inputs) {
  return new LiftN(Array, inputs)
}
exports.combine = combine



// Count the number of events that have occured.

// Signal x -> Signal Int
//
// xs       :  --x--x----x--x------x
// count(xs):  --1--2----3--4------5
function count(xs) {
  return foldp(function(x, y) {
    return x + 1
  }, 0, xs)
}
exports.count = count

// Count the number of events that have occured that
// satisfy a given predicate.

// (x -> Bool) -> Signal x -> Signal Int
function countIf(p, xs) {
  return count(keepIf(p, xs.value, xs))
}
exports.countIf = countIf

// # Filters

function KeepIf(p, value, input) {
  this.p = p
  this.value = p(input.value) ? input.value : value
  this[$outputs] = []
  this[$source] = input
}
KeepIf.receive = function(input, message) {
  if (input.p(message))
    Input.receive(input, message)
}
KeepIf.prototype.constructor = KeepIf
KeepIf.prototype = new Input()
KeepIf.prototype[$receive] = KeepIf.receive

// Keep only events that satisfy the given predicate.
// Elm does not allow undefined signals, so a base case
// must be provided in case the predicate is never satisfied.

// (x -> Bool) -> x -> Signal x -> Signal x
function keepIf(p, x, xs) {
  return new KeepIf(p, x, xs)
}
exports.keepIf = keepIf


function DropIf(p, value, input) {
  this.p = p
  this.value = p(input.value) ? value : input.value
  this[$source] = input
  this[$outputs] = []
}
DropIf.receive = function(input, message) {
  if (!input.p(message))
    Input.receive(input, message)
}
DropIf.prototype = new Input()
DropIf.prototype.constructor = DropIf
DropIf.prototype[$receive] = DropIf.receive

// Drop events that satisfy the given predicate. Elm does not allow
// undefined signals, so a base case must be provided in case the
// predicate is never satisfied.

// (x -> Bool) -> x -> Signal x -> Signal x
function dropIf(p, x, xs) {
  return new DropIf(p, x, xs)
}
exports.dropIf = dropIf


// Keep events only when the first signal is true. When the first signal
// becomes true, the most recent value of the second signal will be propagated.
// Until the first signal becomes false again, all events will be propagated.
// Elm does not allow undefined signals, so a base case must be provided in case
// the first signal is never true.

// Signal Bool -> x -> Signal x -> Signal x
function Skip() { return Skip }
function isSkip(x) { return x === Skip }
function skipIfTrue(isTrue, x) { return isTrue ? Skip : x }
function skipIfFalse(isTrue, x) { return isTrue ? x : Skip }

function keepWhen(state, x, xs) {
  var input = lift(skipIfFalse, dropRepeats(state), xs)
  return dropIf(isSkip, x, input)
}
exports.keepWhen = keepWhen

// Drop events when the first signal is true. When the first signal
// becomes false, the most recent value of the second signal will be
// propagated. Until the first signal becomes true again, all events
// will be propagated. Elm does not allow undefined signals, so a base
// case must be provided in case the first signal is always true.

// Signal Bool -> x -> Signal x -> Signal x
function dropWhen(state, x, xs) {
  var input = lift(skipIfTrue, dropRepeats(state), xs)
  return dropIf(isSkip, x, input)
}
exports.dropWhen = dropWhen

// Drop sequential repeated values. For example, if a signal produces
// the sequence [1,1,2,2,1], it becomes [1,2,1] by dropping the values
// that are the same as the previous value.

// Signal x -> Signal x
function dropRepeats(xs) {
  return dropIf(function(x) {
    return xs.value === x
  }, xs.value, xs)
}
exports.dropRepeats = dropRepeats

// Sample from the second input every time an event occurs on the first
// input. For example, (sampleOn clicks (every second)) will give the
// approximate time of the latest click.

// Signal a -> Signal b -> Signal b
function sampleOn(ticks, input) {
  return merge(dropIf(True, input.value, input),
               lift(function(_) { return input.value }, ticks))
}
exports.sampleOn = sampleOn

function True() { return true }

},{}]},{},[1])
;