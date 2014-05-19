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
