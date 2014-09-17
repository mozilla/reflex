;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var foldp = require("./signal").foldp
var start = require("./signal").start
var diff = require("./html").diff
var select = require("./html").select

function app(input) {
  // maintain state of and post messages with tree changes.
  var tree = foldp(function(past, present) {
    var changes = JSON.parse(JSON.stringify(diff(past, present)))
    self.postMessage(changes)
    return present
  }, input.value, input)

  // receive events via messages and dispatch to vnode
  // listener.
  self.addEventListener("message", function(message) {
    var event = message.data
    if (event) {
      var node = select(event.path, tree.value)
      node.handleEvent(event)
    }
  })

  start(tree)
  self.postMessage(input.value.withPath().toJSON())
}
exports.app = app

},{"./html":3,"./signal":18}],2:[function(require,module,exports){
"use strict";

var signal = require("./signal"),
    Input = signal.Input, start = signal.start,
    stop = signal.stop, end = signal.stop,
    end = signal.end, receive = signal.receive,
    outputs = signal.outputs
var identity = require("functional/identity")


var EventListener = function(type, parse, output, read) {
  this.type = type
  this.output = output
  this.parse = parse
  this.read = read
}
EventListener.prototype = Object.create(Input.prototype)
EventListener.prototype.constructor = EventListener
EventListener.prototype.output = null
EventListener.prototype.type = null
EventListener.prototype.parse = identity
EventListener.prototype.read = identity
EventListener.prototype.handleEvent = function(event) {
  receive(this.output, this.read(this.parse(event)))
}
exports.EventListener = EventListener

function on(type, parse, output, read) {
  return new EventListener(type, parse, output, read)
}
exports.on = on

var MouseListener = function(type, output, read) {
  this.type = type
  this.output = output
  this.read = read
}
MouseListener.prototype = Object.create(EventListener.prototype)
MouseListener.prototype.constructor = MouseListener
exports.MouseListener = MouseListener

var onMouseEvent = function(type) {
  return function(handle, read) {
    return new MouseListener(type, handle, read)
  }
}

exports.onClick = onMouseEvent("click")
exports.onDoubleClick = onMouseEvent("dbclick")
exports.onMouseMove = onMouseEvent("mousemove")
exports.onMouseDown = onMouseEvent("mousedown")
exports.onMouseUp = onMouseEvent("mouseup")
exports.onMouseEnter = onMouseEvent("mouseenter")
exports.onMouseLeave = onMouseEvent("mouseleave")
exports.onMouseOver = onMouseEvent("mouseover")
exports.onMouseOut = onMouseEvent("mouseout")

var KeyboardListener = function(type, output, read) {
  this.type = type
  this.output = output
  this.read = read
}
KeyboardListener.prototype = Object.create(EventListener.prototype)
KeyboardListener.prototype.constructor = KeyboardListener
exports.KeyboardListener = KeyboardListener

var onKeyboardEvent = function(type) {
  return function(handle, read) {
    return new KeyboardListener(type, handle, read)
  }
}

exports.onKeyUp = onKeyboardEvent("keyup")
exports.onKeyDown = onKeyboardEvent("keydown")
exports.onKeyPress = onKeyboardEvent("keypress")

var SimpleEventListener = function(type, output, value) {
  this.type = type
  this.output = output
  this.value = value
}
SimpleEventListener.prototype = Object.create(EventListener.prototype)
SimpleEventListener.prototype.constructor = SimpleEventListener
SimpleEventListener.prototype.handleEvent = function(event) {
  receive(this.output, this.value)
}
exports.SimpleEventListener = SimpleEventListener

var onSimpleEvent = function(type) {
  return function(handle, value) {
    return new SimpleEventListener(type, handle, value)
  }
}

exports.onBlur = onSimpleEvent("blur")
exports.onFocus = onSimpleEvent("focus")
exports.onSubmit = onSimpleEvent("submit")

var InputEventListener = function(output, read) {
  this.output = output
  this.read = read
}
InputEventListener.prototype = Object.create(EventListener.prototype)
InputEventListener.prototype.constructor = InputEventListener
InputEventListener.prototype.type = "input"
InputEventListener.prototype.parse = function(event) {
  return event.value
}


var onInput = function(handle, read) {
  return new InputEventListener(handle, read)
}
exports.onInput = onInput

},{"./signal":18,"functional/identity":4}],3:[function(require,module,exports){
"use stict";

var VNode = require("vtree/vnode");
var VText = require("vtree/vtext");
var vdiff = require("vtree/diff");
var VirtualPatch = require("vtree/vpatch")

// Need to add toJSON methods so that patches could be
// serialized for sending as messages across workers.
VirtualPatch.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    patch: this.patch,
    vNode: this.vNode.toJSON(),
  }
}

var Text = VText
Text.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    text: this.text
  }
}
exports.Text = Text


function text(content) {
  return new Text(content)
}
exports.text = text

var Node = VNode
Node.prototype.withPath = function(base) {
  base = base || ""
  this.properties.attributes["data-reflex-path"] = base

  var index = 0
  var nodes = this.children
  while (index < nodes.length) {
    var node = nodes[index]
    if (node.withPath) {
      var key = node.properties.key || index
      node.withPath(base + "." + key)
    }
    index = index + 1
  }
  return this
}

var toJSON = function(x) {
  return x.toJSON()
}

Node.prototype.toJSON = function() {
  return {
    version: this.version,
    type: this.type,
    count: this.count,
    tagName: this.tagName,
    properties: this.properties,
    children: this.children.map(toJSON),
    key: this.key,
    namespace: this.namespace,
    hasWidgets: this.hasWidgets,
    hooks: this.hooks,
    descendantHooks: this.descendantHooks
  }
}
exports.Node = Node

function node(name, attributes, contents) {
  return new Node(name, {attributes: attributes}, contents)
}
exports.node = node

var EventNode = function (name, properties, contents, listeners) {
  var index = 0
  var count = listeners ? listeners.length : 0
  while (index < count) {
    var type = listeners[index].type
    properties.attributes["data-reflex-event-" + type] = true
    index = index + 1
  }

  Node.call(this, name, properties, contents)
  this.listeners = listeners

}
EventNode.prototype = Object.create(Node.prototype)
EventNode.prototype.constructor = EventNode
EventNode.prototype.handleEvent = function(event) {
  this.listeners.forEach(function(listener) {
    if (listener.type === event.type) {
      listener.handleEvent(event)
    }
  })
}

var eventNode = function(name, attributes, contents, listeners) {
  return new EventNode(name, {attributes: attributes}, contents, listeners)
}
exports.eventNode = eventNode


var diff = function(a, b) {
  return vdiff(a, b.withPath())
}
exports.diff = diff

var select = function(path, root) {
  var entry = root
  var level = 1
  var count = path.length
  while (level < count) {
    var key = path[level]
    entry = entry.children[key]
    level = level + 1
  }
  return entry
}
exports.select = select

},{"vtree/diff":5,"vtree/vnode":15,"vtree/vpatch":16,"vtree/vtext":17}],4:[function(require,module,exports){
"use strict";

module.exports = identity
function identity(value) { return value }

},{}],5:[function(require,module,exports){
var isArray = require("x-is-array")
var isObject = require("is-object")

var VPatch = require("./vpatch")
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var handleThunk = require("./handle-thunk")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        if (isThunk(a) || isThunk(b)) {
            thunks(a, b, patch, index)
        } else {
            hooks(b, patch, index)
        }
        return
    }

    var apply = patch[index]

    if (b == null) {
        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
        destroyWidgets(a, patch, index)
    } else if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties, b.hooks)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                destroyWidgets(a, patch, index)
            }

            apply = diffChildren(a, b, patch, apply, index)
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            destroyWidgets(a, patch, index)
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            destroyWidgets(a, patch, index)
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))

        if (!isWidget(a)) {
            destroyWidgets(a, patch, index)
        }
    }

    if (apply) {
        patch[index] = apply
    }
}

function diffProps(a, b, hooks) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (hooks && aKey in hooks) {
            diff = diff || {}
            diff[aKey] = bValue
        } else {
            if (isObject(aValue) && isObject(bValue)) {
                if (getPrototype(bValue) !== getPrototype(aValue)) {
                    diff = diff || {}
                    diff[aKey] = bValue
                } else {
                    var objectDiff = diffProps(aValue, bValue)
                    if (objectDiff) {
                        diff = diff || {}
                        diff[aKey] = objectDiff
                    }
                }
            } else if (aValue !== bValue) {
                diff = diff || {}
                diff[aKey] = bValue
            }
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var bChildren = reorder(aChildren, b.children)

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else if (!rightNode) {
            if (leftNode) {
                // Excess nodes in a need to be removed
                patch[index] = new VPatch(VPatch.REMOVE, leftNode, null)
                destroyWidgets(leftNode, patch, index)
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (bChildren.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(VPatch.ORDER, a, bChildren.moves))
    }

    return apply
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = new VPatch(VPatch.REMOVE, vNode, null)
        }
    } else if (isVNode(vNode) && vNode.hasWidgets) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b);
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true;
        }
    }

    return false;
}

// Execute hooks when two nodes are identical
function hooks(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = new VPatch(VPatch.PROPS, vNode.hooks, vNode.hooks)
        }

        if (vNode.descendantHooks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                hooks(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    }
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {

    var bKeys = keyIndex(bChildren)

    if (!bKeys) {
        return bChildren
    }

    var aKeys = keyIndex(aChildren)

    if (!aKeys) {
        return bChildren
    }

    var bMatch = {}, aMatch = {}

    for (var key in bKeys) {
        bMatch[bKeys[key]] = aKeys[key]
    }

    for (var key in aKeys) {
        aMatch[aKeys[key]] = bKeys[key]
    }

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen
    var shuffle = []
    var freeIndex = 0
    var i = 0
    var moveIndex = 0
    var moves = {}
    var removes = moves.removes = {}
    var reverse = moves.reverse = {}
    var hasMoves = false

    while (freeIndex < len) {
        var move = aMatch[i]
        if (move !== undefined) {
            shuffle[i] = bChildren[move]
            if (move !== moveIndex) {
                moves[move] = moveIndex
                reverse[moveIndex] = move
                hasMoves = true
            }
            moveIndex++
        } else if (i in aMatch) {
            shuffle[i] = undefined
            removes[i] = moveIndex++
            hasMoves = true
        } else {
            while (bMatch[freeIndex] !== undefined) {
                freeIndex++
            }

            if (freeIndex < len) {
                var freeChild = bChildren[freeIndex]
                if (freeChild) {
                    shuffle[i] = freeChild
                    if (freeIndex !== moveIndex) {
                        hasMoves = true
                        moves[freeIndex] = moveIndex
                        reverse[moveIndex] = freeIndex
                    }
                    moveIndex++
                }
                freeIndex++
            }
        }
        i++
    }

    if (hasMoves) {
        shuffle.moves = moves
    }

    return shuffle
}

function keyIndex(children) {
    var i, keys

    for (i = 0; i < children.length; i++) {
        var child = children[i]

        if (child.key !== undefined) {
            keys = keys || {}
            keys[child.key] = i
        }
    }

    return keys
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"./handle-thunk":6,"./is-thunk":7,"./is-vnode":9,"./is-vtext":10,"./is-widget":11,"./vpatch":16,"is-object":12,"x-is-array":13}],6:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":7,"./is-vnode":9,"./is-vtext":10,"./is-widget":11}],7:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],8:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],9:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":14}],10:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":14}],11:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],12:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],13:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],14:[function(require,module,exports){
module.exports = "1"

},{}],15:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property)) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-vhook":8,"./is-vnode":9,"./is-widget":11,"./version":14}],16:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":14}],17:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":14}],18:[function(require,module,exports){
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
  if (source) {
    source[$connect](source, input)
  }
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

},{}],19:[function(require,module,exports){
"use strict";

var Input = require("reflex/signal").Input
var onInput = require("reflex/event").onInput
var node = require("reflex/html").node
var eventNode = require("reflex/html").eventNode
var text = require("reflex/html").text
var lift = require("reflex/signal").lift
var foldp = require("reflex/signal").foldp
var app = require("reflex/app").app


var actions = new Input()

var init = { field: "" }

var Actions = {
  NoOp: function() {
    return function(state) {
      return state
    }
  },
  UpdateField: function(text) {
    return function(state) {
      return {field: text}
    }
  }
}


// step : State -> Action -> State
var step = function(state, action) {
  return action(state)
}

var state = foldp(step, init, actions)

var queryField = function(text) {
  return eventNode("input", {
    id: "query-box",
    className: "input-box",
    type: "text",
    value: text
  }, [], [
    onInput(actions, Actions.UpdateField)
  ])
}



var view = function(state) {
  return node("div", {}, [
    queryField(state.field),
    node("div", {className: "mirror"}, [
      text(state.field)
    ])
  ])
}

var main = lift(view, state)
exports.main = main

app(main)

},{"reflex/app":1,"reflex/event":2,"reflex/html":3,"reflex/signal":18}]},{},[19])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvYXBwLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2V2ZW50LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2h0bWwuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL2Z1bmN0aW9uYWwvaWRlbnRpdHkuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2RpZmYuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2hhbmRsZS10aHVuay5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdGh1bmsuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZob29rLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92dHJlZS9pcy12bm9kZS5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdnRleHQuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXdpZGdldC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvbm9kZV9tb2R1bGVzL2lzLW9iamVjdC9pbmRleC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvbm9kZV9tb2R1bGVzL3gtaXMtYXJyYXkvaW5kZXguanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3ZlcnNpb24uanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3Zub2RlLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92dHJlZS92cGF0Y2guanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3Z0ZXh0LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L3NpZ25hbC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvcmVmbGV4L2V4YW1wbGVzL3F1ZXJ5LWZpZWxkL2FwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6VkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBmb2xkcCA9IHJlcXVpcmUoXCIuL3NpZ25hbFwiKS5mb2xkcFxudmFyIHN0YXJ0ID0gcmVxdWlyZShcIi4vc2lnbmFsXCIpLnN0YXJ0XG52YXIgZGlmZiA9IHJlcXVpcmUoXCIuL2h0bWxcIikuZGlmZlxudmFyIHNlbGVjdCA9IHJlcXVpcmUoXCIuL2h0bWxcIikuc2VsZWN0XG5cbmZ1bmN0aW9uIGFwcChpbnB1dCkge1xuICAvLyBtYWludGFpbiBzdGF0ZSBvZiBhbmQgcG9zdCBtZXNzYWdlcyB3aXRoIHRyZWUgY2hhbmdlcy5cbiAgdmFyIHRyZWUgPSBmb2xkcChmdW5jdGlvbihwYXN0LCBwcmVzZW50KSB7XG4gICAgdmFyIGNoYW5nZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRpZmYocGFzdCwgcHJlc2VudCkpKVxuICAgIHNlbGYucG9zdE1lc3NhZ2UoY2hhbmdlcylcbiAgICByZXR1cm4gcHJlc2VudFxuICB9LCBpbnB1dC52YWx1ZSwgaW5wdXQpXG5cbiAgLy8gcmVjZWl2ZSBldmVudHMgdmlhIG1lc3NhZ2VzIGFuZCBkaXNwYXRjaCB0byB2bm9kZVxuICAvLyBsaXN0ZW5lci5cbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgdmFyIGV2ZW50ID0gbWVzc2FnZS5kYXRhXG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdChldmVudC5wYXRoLCB0cmVlLnZhbHVlKVxuICAgICAgbm9kZS5oYW5kbGVFdmVudChldmVudClcbiAgICB9XG4gIH0pXG5cbiAgc3RhcnQodHJlZSlcbiAgc2VsZi5wb3N0TWVzc2FnZShpbnB1dC52YWx1ZS53aXRoUGF0aCgpLnRvSlNPTigpKVxufVxuZXhwb3J0cy5hcHAgPSBhcHBcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc2lnbmFsID0gcmVxdWlyZShcIi4vc2lnbmFsXCIpLFxuICAgIElucHV0ID0gc2lnbmFsLklucHV0LCBzdGFydCA9IHNpZ25hbC5zdGFydCxcbiAgICBzdG9wID0gc2lnbmFsLnN0b3AsIGVuZCA9IHNpZ25hbC5zdG9wLFxuICAgIGVuZCA9IHNpZ25hbC5lbmQsIHJlY2VpdmUgPSBzaWduYWwucmVjZWl2ZSxcbiAgICBvdXRwdXRzID0gc2lnbmFsLm91dHB1dHNcbnZhciBpZGVudGl0eSA9IHJlcXVpcmUoXCJmdW5jdGlvbmFsL2lkZW50aXR5XCIpXG5cblxudmFyIEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBwYXJzZSwgb3V0cHV0LCByZWFkKSB7XG4gIHRoaXMudHlwZSA9IHR5cGVcbiAgdGhpcy5vdXRwdXQgPSBvdXRwdXRcbiAgdGhpcy5wYXJzZSA9IHBhcnNlXG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnB1dC5wcm90b3R5cGUpXG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV2ZW50TGlzdGVuZXJcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLm91dHB1dCA9IG51bGxcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLnR5cGUgPSBudWxsXG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5wYXJzZSA9IGlkZW50aXR5XG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5yZWFkID0gaWRlbnRpdHlcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmVjZWl2ZSh0aGlzLm91dHB1dCwgdGhpcy5yZWFkKHRoaXMucGFyc2UoZXZlbnQpKSlcbn1cbmV4cG9ydHMuRXZlbnRMaXN0ZW5lciA9IEV2ZW50TGlzdGVuZXJcblxuZnVuY3Rpb24gb24odHlwZSwgcGFyc2UsIG91dHB1dCwgcmVhZCkge1xuICByZXR1cm4gbmV3IEV2ZW50TGlzdGVuZXIodHlwZSwgcGFyc2UsIG91dHB1dCwgcmVhZClcbn1cbmV4cG9ydHMub24gPSBvblxuXG52YXIgTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIG91dHB1dCwgcmVhZCkge1xuICB0aGlzLnR5cGUgPSB0eXBlXG4gIHRoaXMub3V0cHV0ID0gb3V0cHV0XG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbk1vdXNlTGlzdGVuZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudExpc3RlbmVyLnByb3RvdHlwZSlcbk1vdXNlTGlzdGVuZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2VMaXN0ZW5lclxuZXhwb3J0cy5Nb3VzZUxpc3RlbmVyID0gTW91c2VMaXN0ZW5lclxuXG52YXIgb25Nb3VzZUV2ZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gZnVuY3Rpb24oaGFuZGxlLCByZWFkKSB7XG4gICAgcmV0dXJuIG5ldyBNb3VzZUxpc3RlbmVyKHR5cGUsIGhhbmRsZSwgcmVhZClcbiAgfVxufVxuXG5leHBvcnRzLm9uQ2xpY2sgPSBvbk1vdXNlRXZlbnQoXCJjbGlja1wiKVxuZXhwb3J0cy5vbkRvdWJsZUNsaWNrID0gb25Nb3VzZUV2ZW50KFwiZGJjbGlja1wiKVxuZXhwb3J0cy5vbk1vdXNlTW92ZSA9IG9uTW91c2VFdmVudChcIm1vdXNlbW92ZVwiKVxuZXhwb3J0cy5vbk1vdXNlRG93biA9IG9uTW91c2VFdmVudChcIm1vdXNlZG93blwiKVxuZXhwb3J0cy5vbk1vdXNlVXAgPSBvbk1vdXNlRXZlbnQoXCJtb3VzZXVwXCIpXG5leHBvcnRzLm9uTW91c2VFbnRlciA9IG9uTW91c2VFdmVudChcIm1vdXNlZW50ZXJcIilcbmV4cG9ydHMub25Nb3VzZUxlYXZlID0gb25Nb3VzZUV2ZW50KFwibW91c2VsZWF2ZVwiKVxuZXhwb3J0cy5vbk1vdXNlT3ZlciA9IG9uTW91c2VFdmVudChcIm1vdXNlb3ZlclwiKVxuZXhwb3J0cy5vbk1vdXNlT3V0ID0gb25Nb3VzZUV2ZW50KFwibW91c2VvdXRcIilcblxudmFyIEtleWJvYXJkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBvdXRwdXQsIHJlYWQpIHtcbiAgdGhpcy50eXBlID0gdHlwZVxuICB0aGlzLm91dHB1dCA9IG91dHB1dFxuICB0aGlzLnJlYWQgPSByZWFkXG59XG5LZXlib2FyZExpc3RlbmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRMaXN0ZW5lci5wcm90b3R5cGUpXG5LZXlib2FyZExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEtleWJvYXJkTGlzdGVuZXJcbmV4cG9ydHMuS2V5Ym9hcmRMaXN0ZW5lciA9IEtleWJvYXJkTGlzdGVuZXJcblxudmFyIG9uS2V5Ym9hcmRFdmVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGhhbmRsZSwgcmVhZCkge1xuICAgIHJldHVybiBuZXcgS2V5Ym9hcmRMaXN0ZW5lcih0eXBlLCBoYW5kbGUsIHJlYWQpXG4gIH1cbn1cblxuZXhwb3J0cy5vbktleVVwID0gb25LZXlib2FyZEV2ZW50KFwia2V5dXBcIilcbmV4cG9ydHMub25LZXlEb3duID0gb25LZXlib2FyZEV2ZW50KFwia2V5ZG93blwiKVxuZXhwb3J0cy5vbktleVByZXNzID0gb25LZXlib2FyZEV2ZW50KFwia2V5cHJlc3NcIilcblxudmFyIFNpbXBsZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBvdXRwdXQsIHZhbHVlKSB7XG4gIHRoaXMudHlwZSA9IHR5cGVcbiAgdGhpcy5vdXRwdXQgPSBvdXRwdXRcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5TaW1wbGVFdmVudExpc3RlbmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRMaXN0ZW5lci5wcm90b3R5cGUpXG5TaW1wbGVFdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNpbXBsZUV2ZW50TGlzdGVuZXJcblNpbXBsZUV2ZW50TGlzdGVuZXIucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmVjZWl2ZSh0aGlzLm91dHB1dCwgdGhpcy52YWx1ZSlcbn1cbmV4cG9ydHMuU2ltcGxlRXZlbnRMaXN0ZW5lciA9IFNpbXBsZUV2ZW50TGlzdGVuZXJcblxudmFyIG9uU2ltcGxlRXZlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHJldHVybiBmdW5jdGlvbihoYW5kbGUsIHZhbHVlKSB7XG4gICAgcmV0dXJuIG5ldyBTaW1wbGVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZSwgdmFsdWUpXG4gIH1cbn1cblxuZXhwb3J0cy5vbkJsdXIgPSBvblNpbXBsZUV2ZW50KFwiYmx1clwiKVxuZXhwb3J0cy5vbkZvY3VzID0gb25TaW1wbGVFdmVudChcImZvY3VzXCIpXG5leHBvcnRzLm9uU3VibWl0ID0gb25TaW1wbGVFdmVudChcInN1Ym1pdFwiKVxuXG52YXIgSW5wdXRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24ob3V0cHV0LCByZWFkKSB7XG4gIHRoaXMub3V0cHV0ID0gb3V0cHV0XG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbklucHV0RXZlbnRMaXN0ZW5lci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50TGlzdGVuZXIucHJvdG90eXBlKVxuSW5wdXRFdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IElucHV0RXZlbnRMaXN0ZW5lclxuSW5wdXRFdmVudExpc3RlbmVyLnByb3RvdHlwZS50eXBlID0gXCJpbnB1dFwiXG5JbnB1dEV2ZW50TGlzdGVuZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIGV2ZW50LnZhbHVlXG59XG5cblxudmFyIG9uSW5wdXQgPSBmdW5jdGlvbihoYW5kbGUsIHJlYWQpIHtcbiAgcmV0dXJuIG5ldyBJbnB1dEV2ZW50TGlzdGVuZXIoaGFuZGxlLCByZWFkKVxufVxuZXhwb3J0cy5vbklucHV0ID0gb25JbnB1dFxuIiwiXCJ1c2Ugc3RpY3RcIjtcblxudmFyIFZOb2RlID0gcmVxdWlyZShcInZ0cmVlL3Zub2RlXCIpO1xudmFyIFZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL3Z0ZXh0XCIpO1xudmFyIHZkaWZmID0gcmVxdWlyZShcInZ0cmVlL2RpZmZcIik7XG52YXIgVmlydHVhbFBhdGNoID0gcmVxdWlyZShcInZ0cmVlL3ZwYXRjaFwiKVxuXG4vLyBOZWVkIHRvIGFkZCB0b0pTT04gbWV0aG9kcyBzbyB0aGF0IHBhdGNoZXMgY291bGQgYmVcbi8vIHNlcmlhbGl6ZWQgZm9yIHNlbmRpbmcgYXMgbWVzc2FnZXMgYWNyb3NzIHdvcmtlcnMuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcbiAgICB0eXBlOiB0aGlzLnR5cGUsXG4gICAgcGF0Y2g6IHRoaXMucGF0Y2gsXG4gICAgdk5vZGU6IHRoaXMudk5vZGUudG9KU09OKCksXG4gIH1cbn1cblxudmFyIFRleHQgPSBWVGV4dFxuVGV4dC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgIHR5cGU6IHRoaXMudHlwZSxcbiAgICB0ZXh0OiB0aGlzLnRleHRcbiAgfVxufVxuZXhwb3J0cy5UZXh0ID0gVGV4dFxuXG5cbmZ1bmN0aW9uIHRleHQoY29udGVudCkge1xuICByZXR1cm4gbmV3IFRleHQoY29udGVudClcbn1cbmV4cG9ydHMudGV4dCA9IHRleHRcblxudmFyIE5vZGUgPSBWTm9kZVxuTm9kZS5wcm90b3R5cGUud2l0aFBhdGggPSBmdW5jdGlvbihiYXNlKSB7XG4gIGJhc2UgPSBiYXNlIHx8IFwiXCJcbiAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXNbXCJkYXRhLXJlZmxleC1wYXRoXCJdID0gYmFzZVxuXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIG5vZGVzID0gdGhpcy5jaGlsZHJlblxuICB3aGlsZSAoaW5kZXggPCBub2Rlcy5sZW5ndGgpIHtcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2luZGV4XVxuICAgIGlmIChub2RlLndpdGhQYXRoKSB7XG4gICAgICB2YXIga2V5ID0gbm9kZS5wcm9wZXJ0aWVzLmtleSB8fCBpbmRleFxuICAgICAgbm9kZS53aXRoUGF0aChiYXNlICsgXCIuXCIgKyBrZXkpXG4gICAgfVxuICAgIGluZGV4ID0gaW5kZXggKyAxXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxudmFyIHRvSlNPTiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHgudG9KU09OKClcbn1cblxuTm9kZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgIHR5cGU6IHRoaXMudHlwZSxcbiAgICBjb3VudDogdGhpcy5jb3VudCxcbiAgICB0YWdOYW1lOiB0aGlzLnRhZ05hbWUsXG4gICAgcHJvcGVydGllczogdGhpcy5wcm9wZXJ0aWVzLFxuICAgIGNoaWxkcmVuOiB0aGlzLmNoaWxkcmVuLm1hcCh0b0pTT04pLFxuICAgIGtleTogdGhpcy5rZXksXG4gICAgbmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcbiAgICBoYXNXaWRnZXRzOiB0aGlzLmhhc1dpZGdldHMsXG4gICAgaG9va3M6IHRoaXMuaG9va3MsXG4gICAgZGVzY2VuZGFudEhvb2tzOiB0aGlzLmRlc2NlbmRhbnRIb29rc1xuICB9XG59XG5leHBvcnRzLk5vZGUgPSBOb2RlXG5cbmZ1bmN0aW9uIG5vZGUobmFtZSwgYXR0cmlidXRlcywgY29udGVudHMpIHtcbiAgcmV0dXJuIG5ldyBOb2RlKG5hbWUsIHthdHRyaWJ1dGVzOiBhdHRyaWJ1dGVzfSwgY29udGVudHMpXG59XG5leHBvcnRzLm5vZGUgPSBub2RlXG5cbnZhciBFdmVudE5vZGUgPSBmdW5jdGlvbiAobmFtZSwgcHJvcGVydGllcywgY29udGVudHMsIGxpc3RlbmVycykge1xuICB2YXIgaW5kZXggPSAwXG4gIHZhciBjb3VudCA9IGxpc3RlbmVycyA/IGxpc3RlbmVycy5sZW5ndGggOiAwXG4gIHdoaWxlIChpbmRleCA8IGNvdW50KSB7XG4gICAgdmFyIHR5cGUgPSBsaXN0ZW5lcnNbaW5kZXhdLnR5cGVcbiAgICBwcm9wZXJ0aWVzLmF0dHJpYnV0ZXNbXCJkYXRhLXJlZmxleC1ldmVudC1cIiArIHR5cGVdID0gdHJ1ZVxuICAgIGluZGV4ID0gaW5kZXggKyAxXG4gIH1cblxuICBOb2RlLmNhbGwodGhpcywgbmFtZSwgcHJvcGVydGllcywgY29udGVudHMpXG4gIHRoaXMubGlzdGVuZXJzID0gbGlzdGVuZXJzXG5cbn1cbkV2ZW50Tm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE5vZGUucHJvdG90eXBlKVxuRXZlbnROb2RlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV2ZW50Tm9kZVxuRXZlbnROb2RlLnByb3RvdHlwZS5oYW5kbGVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBpZiAobGlzdGVuZXIudHlwZSA9PT0gZXZlbnQudHlwZSkge1xuICAgICAgbGlzdGVuZXIuaGFuZGxlRXZlbnQoZXZlbnQpXG4gICAgfVxuICB9KVxufVxuXG52YXIgZXZlbnROb2RlID0gZnVuY3Rpb24obmFtZSwgYXR0cmlidXRlcywgY29udGVudHMsIGxpc3RlbmVycykge1xuICByZXR1cm4gbmV3IEV2ZW50Tm9kZShuYW1lLCB7YXR0cmlidXRlczogYXR0cmlidXRlc30sIGNvbnRlbnRzLCBsaXN0ZW5lcnMpXG59XG5leHBvcnRzLmV2ZW50Tm9kZSA9IGV2ZW50Tm9kZVxuXG5cbnZhciBkaWZmID0gZnVuY3Rpb24oYSwgYikge1xuICByZXR1cm4gdmRpZmYoYSwgYi53aXRoUGF0aCgpKVxufVxuZXhwb3J0cy5kaWZmID0gZGlmZlxuXG52YXIgc2VsZWN0ID0gZnVuY3Rpb24ocGF0aCwgcm9vdCkge1xuICB2YXIgZW50cnkgPSByb290XG4gIHZhciBsZXZlbCA9IDFcbiAgdmFyIGNvdW50ID0gcGF0aC5sZW5ndGhcbiAgd2hpbGUgKGxldmVsIDwgY291bnQpIHtcbiAgICB2YXIga2V5ID0gcGF0aFtsZXZlbF1cbiAgICBlbnRyeSA9IGVudHJ5LmNoaWxkcmVuW2tleV1cbiAgICBsZXZlbCA9IGxldmVsICsgMVxuICB9XG4gIHJldHVybiBlbnRyeVxufVxuZXhwb3J0cy5zZWxlY3QgPSBzZWxlY3RcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGlkZW50aXR5XG5mdW5jdGlvbiBpZGVudGl0eSh2YWx1ZSkgeyByZXR1cm4gdmFsdWUgfVxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxudmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxuXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4vdnBhdGNoXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCIuL2hhbmRsZS10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gICAgdmFyIHBhdGNoID0geyBhOiBhIH1cbiAgICB3YWxrKGEsIGIsIHBhdGNoLCAwKVxuICAgIHJldHVybiBwYXRjaFxufVxuXG5mdW5jdGlvbiB3YWxrKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgICAgIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBob29rcyhiLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG5cbiAgICBpZiAoYiA9PSBudWxsKSB7XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgYSwgYikpXG4gICAgICAgIGRlc3Ryb3lXaWRnZXRzKGEsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZShiKSkge1xuICAgICAgICBpZiAoaXNWTm9kZShhKSkge1xuICAgICAgICAgICAgaWYgKGEudGFnTmFtZSA9PT0gYi50YWdOYW1lICYmXG4gICAgICAgICAgICAgICAgYS5uYW1lc3BhY2UgPT09IGIubmFtZXNwYWNlICYmXG4gICAgICAgICAgICAgICAgYS5rZXkgPT09IGIua2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzUGF0Y2ggPSBkaWZmUHJvcHMoYS5wcm9wZXJ0aWVzLCBiLnByb3BlcnRpZXMsIGIuaG9va3MpXG4gICAgICAgICAgICAgICAgaWYgKHByb3BzUGF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCBhLCBwcm9wc1BhdGNoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFwcGx5ID0gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVlRleHQoYikpIHtcbiAgICAgICAgaWYgKCFpc1ZUZXh0KGEpKSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH0gZWxzZSBpZiAoYS50ZXh0ICE9PSBiLnRleHQpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaWRnZXQoYikpIHtcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guV0lER0VULCBhLCBiKSlcblxuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwbHlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZQcm9wcyhhLCBiLCBob29rcykge1xuICAgIHZhciBkaWZmXG5cbiAgICBmb3IgKHZhciBhS2V5IGluIGEpIHtcbiAgICAgICAgaWYgKCEoYUtleSBpbiBiKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYUtleV0gPSB1bmRlZmluZWRcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBhVmFsdWUgPSBhW2FLZXldXG4gICAgICAgIHZhciBiVmFsdWUgPSBiW2FLZXldXG5cbiAgICAgICAgaWYgKGhvb2tzICYmIGFLZXkgaW4gaG9va3MpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QoYVZhbHVlKSAmJiBpc09iamVjdChiVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGdldFByb3RvdHlwZShiVmFsdWUpICE9PSBnZXRQcm90b3R5cGUoYVZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9iamVjdERpZmYgPSBkaWZmUHJvcHMoYVZhbHVlLCBiVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChvYmplY3REaWZmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IG9iamVjdERpZmZcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYVZhbHVlICE9PSBiVmFsdWUpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGJLZXkgaW4gYikge1xuICAgICAgICBpZiAoIShiS2V5IGluIGEpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZltiS2V5XSA9IGJbYktleV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleCkge1xuICAgIHZhciBhQ2hpbGRyZW4gPSBhLmNoaWxkcmVuXG4gICAgdmFyIGJDaGlsZHJlbiA9IHJlb3JkZXIoYUNoaWxkcmVuLCBiLmNoaWxkcmVuKVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBiQ2hpbGRyZW5baV1cbiAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgIGlmICghbGVmdE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChyaWdodE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYiBuZWVkIHRvIGJlIGFkZGVkXG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guSU5TRVJULCBudWxsLCByaWdodE5vZGUpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFyaWdodE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBhIG5lZWQgdG8gYmUgcmVtb3ZlZFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgbGVmdE5vZGUsIG51bGwpXG4gICAgICAgICAgICAgICAgZGVzdHJveVdpZGdldHMobGVmdE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdhbGsobGVmdE5vZGUsIHJpZ2h0Tm9kZSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGlzVk5vZGUobGVmdE5vZGUpICYmIGxlZnROb2RlLmNvdW50KSB7XG4gICAgICAgICAgICBpbmRleCArPSBsZWZ0Tm9kZS5jb3VudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGJDaGlsZHJlbi5tb3Zlcykge1xuICAgICAgICAvLyBSZW9yZGVyIG5vZGVzIGxhc3RcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guT1JERVIsIGEsIGJDaGlsZHJlbi5tb3ZlcykpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5XG59XG5cbi8vIFBhdGNoIHJlY29yZHMgZm9yIGFsbCBkZXN0cm95ZWQgd2lkZ2V0cyBtdXN0IGJlIGFkZGVkIGJlY2F1c2Ugd2UgbmVlZFxuLy8gYSBET00gbm9kZSByZWZlcmVuY2UgZm9yIHRoZSBkZXN0cm95IGZ1bmN0aW9uXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzV2lkZ2V0KHZOb2RlKSkge1xuICAgICAgICBpZiAodHlwZW9mIHZOb2RlLmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCB2Tm9kZSwgbnVsbClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZSh2Tm9kZSkgJiYgdk5vZGUuaGFzV2lkZ2V0cykge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIENyZWF0ZSBhIHN1Yi1wYXRjaCBmb3IgdGh1bmtzXG5mdW5jdGlvbiB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgdmFyIG5vZGVzID0gaGFuZGxlVGh1bmsoYSwgYik7XG4gICAgdmFyIHRodW5rUGF0Y2ggPSBkaWZmKG5vZGVzLmEsIG5vZGVzLmIpXG4gICAgaWYgKGhhc1BhdGNoZXModGh1bmtQYXRjaCkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guVEhVTkssIG51bGwsIHRodW5rUGF0Y2gpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNQYXRjaGVzKHBhdGNoKSB7XG4gICAgZm9yICh2YXIgaW5kZXggaW4gcGF0Y2gpIHtcbiAgICAgICAgaWYgKGluZGV4ICE9PSBcImFcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEV4ZWN1dGUgaG9va3Mgd2hlbiB0d28gbm9kZXMgYXJlIGlkZW50aWNhbFxuZnVuY3Rpb24gaG9va3Modk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1ZOb2RlKHZOb2RlKSkge1xuICAgICAgICBpZiAodk5vZGUuaG9va3MpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCB2Tm9kZS5ob29rcywgdk5vZGUuaG9va3MpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodk5vZGUuZGVzY2VuZGFudEhvb2tzKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgaG9va3MoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gTGlzdCBkaWZmLCBuYWl2ZSBsZWZ0IHRvIHJpZ2h0IHJlb3JkZXJpbmdcbmZ1bmN0aW9uIHJlb3JkZXIoYUNoaWxkcmVuLCBiQ2hpbGRyZW4pIHtcblxuICAgIHZhciBiS2V5cyA9IGtleUluZGV4KGJDaGlsZHJlbilcblxuICAgIGlmICghYktleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBhS2V5cyA9IGtleUluZGV4KGFDaGlsZHJlbilcblxuICAgIGlmICghYUtleXMpIHtcbiAgICAgICAgcmV0dXJuIGJDaGlsZHJlblxuICAgIH1cblxuICAgIHZhciBiTWF0Y2ggPSB7fSwgYU1hdGNoID0ge31cblxuICAgIGZvciAodmFyIGtleSBpbiBiS2V5cykge1xuICAgICAgICBiTWF0Y2hbYktleXNba2V5XV0gPSBhS2V5c1trZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIga2V5IGluIGFLZXlzKSB7XG4gICAgICAgIGFNYXRjaFthS2V5c1trZXldXSA9IGJLZXlzW2tleV1cbiAgICB9XG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuICAgIHZhciBzaHVmZmxlID0gW11cbiAgICB2YXIgZnJlZUluZGV4ID0gMFxuICAgIHZhciBpID0gMFxuICAgIHZhciBtb3ZlSW5kZXggPSAwXG4gICAgdmFyIG1vdmVzID0ge31cbiAgICB2YXIgcmVtb3ZlcyA9IG1vdmVzLnJlbW92ZXMgPSB7fVxuICAgIHZhciByZXZlcnNlID0gbW92ZXMucmV2ZXJzZSA9IHt9XG4gICAgdmFyIGhhc01vdmVzID0gZmFsc2VcblxuICAgIHdoaWxlIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgdmFyIG1vdmUgPSBhTWF0Y2hbaV1cbiAgICAgICAgaWYgKG1vdmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGJDaGlsZHJlblttb3ZlXVxuICAgICAgICAgICAgaWYgKG1vdmUgIT09IG1vdmVJbmRleCkge1xuICAgICAgICAgICAgICAgIG1vdmVzW21vdmVdID0gbW92ZUluZGV4XG4gICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gbW92ZVxuICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgfSBlbHNlIGlmIChpIGluIGFNYXRjaCkge1xuICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IHVuZGVmaW5lZFxuICAgICAgICAgICAgcmVtb3Zlc1tpXSA9IG1vdmVJbmRleCsrXG4gICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChiTWF0Y2hbZnJlZUluZGV4XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKGZyZWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgICAgIHZhciBmcmVlQ2hpbGQgPSBiQ2hpbGRyZW5bZnJlZUluZGV4XVxuICAgICAgICAgICAgICAgIGlmIChmcmVlQ2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgc2h1ZmZsZVtpXSA9IGZyZWVDaGlsZFxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJlZUluZGV4ICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc01vdmVzID0gdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZXNbZnJlZUluZGV4XSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV2ZXJzZVttb3ZlSW5kZXhdID0gZnJlZUluZGV4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW92ZUluZGV4KytcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJlZUluZGV4KytcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpKytcbiAgICB9XG5cbiAgICBpZiAoaGFzTW92ZXMpIHtcbiAgICAgICAgc2h1ZmZsZS5tb3ZlcyA9IG1vdmVzXG4gICAgfVxuXG4gICAgcmV0dXJuIHNodWZmbGVcbn1cblxuZnVuY3Rpb24ga2V5SW5kZXgoY2hpbGRyZW4pIHtcbiAgICB2YXIgaSwga2V5c1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cbiAgICAgICAgaWYgKGNoaWxkLmtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBrZXlzID0ga2V5cyB8fCB7fVxuICAgICAgICAgICAga2V5c1tjaGlsZC5rZXldID0gaVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXNcbn1cblxuZnVuY3Rpb24gYXBwZW5kUGF0Y2goYXBwbHksIHBhdGNoKSB7XG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFwcGx5KSkge1xuICAgICAgICAgICAgYXBwbHkucHVzaChwYXRjaClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gW2FwcGx5LCBwYXRjaF1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcHBseVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRjaFxuICAgIH1cbn1cbiIsInZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZVRodW5rXG5cbmZ1bmN0aW9uIGhhbmRsZVRodW5rKGEsIGIpIHtcbiAgICB2YXIgcmVuZGVyZWRBID0gYVxuICAgIHZhciByZW5kZXJlZEIgPSBiXG5cbiAgICBpZiAoaXNUaHVuayhiKSkge1xuICAgICAgICByZW5kZXJlZEIgPSByZW5kZXJUaHVuayhiLCBhKVxuICAgIH1cblxuICAgIGlmIChpc1RodW5rKGEpKSB7XG4gICAgICAgIHJlbmRlcmVkQSA9IHJlbmRlclRodW5rKGEsIG51bGwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogcmVuZGVyZWRBLFxuICAgICAgICBiOiByZW5kZXJlZEJcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRodW5rKHRodW5rLCBwcmV2aW91cykge1xuICAgIHZhciByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGVcblxuICAgIGlmICghcmVuZGVyZWRUaHVuaykge1xuICAgICAgICByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGUgPSB0aHVuay5yZW5kZXIocHJldmlvdXMpXG4gICAgfVxuXG4gICAgaWYgKCEoaXNWTm9kZShyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNWVGV4dChyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNXaWRnZXQocmVuZGVyZWRUaHVuaykpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRodW5rIGRpZCBub3QgcmV0dXJuIGEgdmFsaWQgbm9kZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRUaHVua1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1RodW5rXHJcblxyXG5mdW5jdGlvbiBpc1RodW5rKHQpIHtcclxuICAgIHJldHVybiB0ICYmIHQudHlwZSA9PT0gXCJUaHVua1wiXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc0hvb2tcblxuZnVuY3Rpb24gaXNIb29rKGhvb2spIHtcbiAgICByZXR1cm4gaG9vayAmJiB0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdFxuXG5mdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGxcbn1cbiIsInZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheVxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5hdGl2ZUlzQXJyYXkgfHwgaXNBcnJheVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjFcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1ZIb29rID0gcmVxdWlyZShcIi4vaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsTm9kZVxuXG52YXIgbm9Qcm9wZXJ0aWVzID0ge31cbnZhciBub0NoaWxkcmVuID0gW11cblxuZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4sIGtleSwgbmFtZXNwYWNlKSB7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwgbm9Qcm9wZXJ0aWVzXG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuIHx8IG5vQ2hpbGRyZW5cbiAgICB0aGlzLmtleSA9IGtleSAhPSBudWxsID8gU3RyaW5nKGtleSkgOiB1bmRlZmluZWRcbiAgICB0aGlzLm5hbWVzcGFjZSA9ICh0eXBlb2YgbmFtZXNwYWNlID09PSBcInN0cmluZ1wiKSA/IG5hbWVzcGFjZSA6IG51bGxcblxuICAgIHZhciBjb3VudCA9IChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHx8IDBcbiAgICB2YXIgZGVzY2VuZGFudHMgPSAwXG4gICAgdmFyIGhhc1dpZGdldHMgPSBmYWxzZVxuICAgIHZhciBkZXNjZW5kYW50SG9va3MgPSBmYWxzZVxuICAgIHZhciBob29rc1xuXG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG4gICAgICAgICAgICBpZiAoaXNWSG9vayhwcm9wZXJ0eSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWhvb2tzKSB7XG4gICAgICAgICAgICAgICAgICAgIGhvb2tzID0ge31cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBob29rc1twcm9wTmFtZV0gPSBwcm9wZXJ0eVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSkge1xuICAgICAgICAgICAgZGVzY2VuZGFudHMgKz0gY2hpbGQuY291bnQgfHwgMFxuXG4gICAgICAgICAgICBpZiAoIWhhc1dpZGdldHMgJiYgY2hpbGQuaGFzV2lkZ2V0cykge1xuICAgICAgICAgICAgICAgIGhhc1dpZGdldHMgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVzY2VuZGFudEhvb2tzICYmIChjaGlsZC5ob29rcyB8fCBjaGlsZC5kZXNjZW5kYW50SG9va3MpKSB7XG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudEhvb2tzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNXaWRnZXRzICYmIGlzV2lkZ2V0KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGlsZC5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGNvdW50ICsgZGVzY2VuZGFudHNcbiAgICB0aGlzLmhhc1dpZGdldHMgPSBoYXNXaWRnZXRzXG4gICAgdGhpcy5ob29rcyA9IGhvb2tzXG4gICAgdGhpcy5kZXNjZW5kYW50SG9va3MgPSBkZXNjZW5kYW50SG9va3Ncbn1cblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbE5vZGVcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cblZpcnR1YWxQYXRjaC5OT05FID0gMFxuVmlydHVhbFBhdGNoLlZURVhUID0gMVxuVmlydHVhbFBhdGNoLlZOT0RFID0gMlxuVmlydHVhbFBhdGNoLldJREdFVCA9IDNcblZpcnR1YWxQYXRjaC5QUk9QUyA9IDRcblZpcnR1YWxQYXRjaC5PUkRFUiA9IDVcblZpcnR1YWxQYXRjaC5JTlNFUlQgPSA2XG5WaXJ0dWFsUGF0Y2guUkVNT1ZFID0gN1xuVmlydHVhbFBhdGNoLlRIVU5LID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxQYXRjaFxuXG5mdW5jdGlvbiBWaXJ0dWFsUGF0Y2godHlwZSwgdk5vZGUsIHBhdGNoKSB7XG4gICAgdGhpcy50eXBlID0gTnVtYmVyKHR5cGUpXG4gICAgdGhpcy52Tm9kZSA9IHZOb2RlXG4gICAgdGhpcy5wYXRjaCA9IHBhdGNoXG59XG5cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFBhdGNoXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxUZXh0XG5cbmZ1bmN0aW9uIFZpcnR1YWxUZXh0KHRleHQpIHtcbiAgICB0aGlzLnRleHQgPSBTdHJpbmcodGV4dClcbn1cblxuVmlydHVhbFRleHQucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFRleHRcIlxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cblxuLy8gVGhlIGxpYnJhcnkgZm9yIGdlbmVyYWwgc2lnbmFsIG1hbmlwdWxhdGlvbi4gSW5jbHVkZXMgYGxpZnRgIGZ1bmN0aW9uXG4vLyAodGhhdCBzdXBwb3J0cyB1cCB0byA4IGlucHV0cyksIGNvbWJpbmF0aW9ucywgZmlsdGVycywgYW5kIHBhc3QtZGVwZW5kZW5jZS5cbi8vXG4vLyBTaWduYWxzIGFyZSB0aW1lLXZhcnlpbmcgdmFsdWVzLiBMaWZ0ZWQgZnVuY3Rpb25zIGFyZSByZWV2YWx1YXRlZCB3aGVudmVyXG4vLyBhbnkgb2YgdGhlaXIgaW5wdXQgc2lnbmFscyBoYXMgYW4gZXZlbnQuIFNpZ25hbCBldmVudHMgbWF5IGJlIG9mIHRoZSBzYW1lXG4vLyB2YWx1ZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIHNpZ25hbC4gU3VjaCBzaWduYWxzIGFyZSB1c2VmdWwgZm9yXG4vLyB0aW1pbmcgYW5kIHBhc3QtZGVwZW5kZW5jZS5cbi8vXG4vLyBTb21lIHVzZWZ1bCBmdW5jdGlvbnMgZm9yIHdvcmtpbmcgd2l0aCB0aW1lIChlLmcuIHNldHRpbmcgRlBTKSBhbmQgY29tYmluaW5nXG4vLyBzaWduYWxzIGFuZCB0aW1lIChlLmcuIGRlbGF5aW5nIHVwZGF0ZXMsIGdldHRpbmcgdGltZXN0YW1wcykgY2FuIGJlIGZvdW5kIGluXG4vLyB0aGUgVGltZSBsaWJyYXJ5LlxuLy9cbi8vIE1vZHVsZSBpbXBsZW1lbnRzIGVsbSBBUEk6IGh0dHA6Ly9kb2NzLmVsbS1sYW5nLm9yZy9saWJyYXJ5L1NpZ25hbC5lbG1cblxuXG52YXIgJHNvdXJjZSA9IFwic291cmNlQHNpZ25hbFwiXG52YXIgJHNvdXJjZXMgPSBcInNvdXJjZXNAc2lnbmFsXCJcbnZhciAkb3V0cHV0cyA9IFwib3V0cHV0c0BzaWduYWxcIlxudmFyICRjb25uZWN0ID0gXCJjb25uZWN0QHNpZ25hbFwiXG52YXIgJGRpc2Nvbm5lY3QgPSBcImRpc2Nvbm5lY3RAc2lnbmFsXCJcbnZhciAkcmVjZWl2ZSA9IFwicmVjZWl2ZUBzaWduYWxcIlxudmFyICRlcnJvciA9IFwiZXJyb3JAc2lnbmFsXCJcbnZhciAkZW5kID0gXCJlbmRAc2lnbmFsXCJcbnZhciAkc3RhcnQgPSBcInN0YXJ0QHNpZ25hbFwiXG52YXIgJHN0b3AgPSBcInN0b3BAc2lnbmFsXCJcbnZhciAkc3RhdGUgPSBcInN0YXRlQHNpZ25hbFwiXG52YXIgJHBlbmRpbmcgPSBcInBlbmRpbmdAc2lnbmFsXCJcblxuZnVuY3Rpb24gb3V0cHV0cyhpbnB1dCkgeyByZXR1cm4gaW5wdXRbJG91dHB1dHNdIH1cbm91dHB1dHMudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRvdXRwdXRzIH1cbmV4cG9ydHMub3V0cHV0cyA9IG91dHB1dHNcblxuZnVuY3Rpb24gc3RhcnQoaW5wdXQpIHsgaW5wdXRbJHN0YXJ0XShpbnB1dCkgfVxuc3RhcnQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRzdGFydCB9XG5leHBvcnRzLnN0YXJ0ID0gc3RhcnRcblxuZnVuY3Rpb24gc3RvcChpbnB1dCkgeyBpbnB1dFskc3RvcF0oaW5wdXQpIH1cbnN0b3AudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRzdG9wIH1cbmV4cG9ydHMuc3RvcCA9IHN0b3BcblxuZnVuY3Rpb24gY29ubmVjdChzb3VyY2UsIHRhcmdldCkgeyBzb3VyY2VbJGNvbm5lY3RdKHNvdXJjZSwgdGFyZ2V0KSB9XG5jb25uZWN0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkY29ubmVjdCB9XG5leHBvcnRzLmNvbm5lY3QgPSBjb25uZWN0XG5cbmZ1bmN0aW9uIGRpc2Nvbm5lY3Qoc291cmNlLCB0YXJnZXQpIHsgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIHRhcmdldCkgfVxuZGlzY29ubmVjdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJGRpc2Nvbm5lY3QgfVxuZXhwb3J0cy5kaXNjb25uZWN0ID0gZGlzY29ubmVjdFxuXG5mdW5jdGlvbiByZWNlaXZlKGlucHV0LCBtZXNzYWdlKSB7IGlucHV0WyRyZWNlaXZlXShpbnB1dCwgbWVzc2FnZSkgfVxucmVjZWl2ZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJHJlY2VpdmUgfVxuZXhwb3J0cy5yZWNlaXZlID0gcmVjZWl2ZVxuXG5mdW5jdGlvbiBlcnJvcihpbnB1dCwgbWVzc2FnZSkgeyBpbnB1dFskZXJyb3JdKGlucHV0LCBtZXNzYWdlKSB9XG5lcnJvci50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJGVycm9yIH1cbmV4cG9ydHMuZXJyb3IgPSBlcnJvclxuXG5mdW5jdGlvbiBlbmQoaW5wdXQpIHsgaW5wdXRbJGVuZF0oaW5wdXQpIH1cbmVuZC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJGVuZCB9XG5leHBvcnRzLmVuZCA9IGVuZFxuXG5mdW5jdGlvbiBzdHJpbmdpZnkoaW5wdXQpIHtcbiAgcmV0dXJuIGlucHV0Lm5hbWUgKyBcIltcIiArIChpbnB1dFskb3V0cHV0c10gfHwgW10pLm1hcChmdW5jdGlvbih4KSB7IHJldHVybiB4Lm5hbWUgfSkgKyBcIl1cIlxufVxuXG52YXIgc3RyaW5naWZpZXIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5mdW5jdGlvbiBpc0Vycm9yKG1lc3NhZ2UpIHtcbiAgcmV0dXJuIHN0cmluZ2lmaWVyLmNhbGwobWVzc2FnZSkgPT09IFwiW29iamVjdCBFcnJvcl1cIlxufVxuXG5mdW5jdGlvbiBSZXR1cm4odmFsdWUpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJldHVybikpXG4gICAgcmV0dXJuIG5ldyBSZXR1cm4odmFsdWUpXG5cbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5leHBvcnRzLlJldHVybiA9IFJldHVyblxuXG5mdW5jdGlvbiBzZW5kKGlucHV0LCBtZXNzYWdlKSB7XG4gIGlmIChtZXNzYWdlIGluc3RhbmNlb2YgUmV0dXJuKSB7XG4gICAgaW5wdXRbJHJlY2VpdmVdKGlucHV0LCBtZXNzYWdlLnZhbHVlKVxuICAgIGlucHV0WyRlbmRdKGlucHV0KVxuICB9XG4gIGVsc2UgaWYgKGlzRXJyb3IobWVzc2FnZSkpIHtcbiAgICBpbnB1dFskZXJyb3JdKGlucHV0LCBtZXNzYWdlKVxuICB9XG4gIGVsc2Uge1xuICAgIGlucHV0WyRyZWNlaXZlXShpbnB1dCwgbWVzc2FnZSlcbiAgfVxufVxuZXhwb3J0cy5zZW5kID0gc2VuZFxuXG5mdW5jdGlvbiBCcmVhaygpIHt9XG5leHBvcnRzLkJyZWFrID0gQnJlYWtcblxuXG5mdW5jdGlvbiBJbnB1dChzb3VyY2UpIHtcbiAgdGhpc1skc291cmNlXSA9IHNvdXJjZTtcbiAgdGhpc1skb3V0cHV0c10gPSBbXTtcbn1cbmV4cG9ydHMuSW5wdXQgPSBJbnB1dFxuXG5cbi8vIGBJbnB1dC5zdGFydGAgaXMgaW52b2tlZCB3aXRoIGFuIGBpbnB1dGAgd2hlbmV2ZXIgc3lzdGVtIGlzXG4vLyByZWFkeSB0byBzdGFydCByZWNlaXZpbmcgdmFsdWVzLiBBZnRlciB0aGlzIHBvaW50IGBpbnB1dGAgY2FuXG4vLyBzdGFydCBzZW5kaW5nIG1lc3NhZ2VzLiBHZW5lcmljIGJlaGF2aW9yIGlzIHRvIGBjb25uZWN0YCB0b1xuLy8gdGhlIGBpbnB1dFskc291cmNlXWAgdG8gc3RhcnQgcmVjZWl2aW5nIG1lc3NhZ2VzLlxuSW5wdXQuc3RhcnQgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgc291cmNlID0gaW5wdXRbJHNvdXJjZV1cbiAgaWYgKHNvdXJjZSkge1xuICAgIHNvdXJjZVskY29ubmVjdF0oc291cmNlLCBpbnB1dClcbiAgfVxufVxuXG4vLyBgSW5wdXQuc3RvcGAgaXMgaW52b2tlZCB3aXRoIGFuIGBpbnB1dGAgd2hlbmV2ZXIgaXQgbmVlZHMgdG9cbi8vIHN0b3AuIEFmdGVyIHRoaXMgcG9pbnQgYGlucHV0YCBzaG91bGQgc3RvcCBzZW5kaW5nIG1lc3NhZ2VzLlxuLy8gR2VuZXJpYyBgSW5wdXRgIGJlaGF2aW9yIGlzIHRvIGBkaXNjb25uZWN0YCBmcm9tIHRoZVxuLy8gYGlucHV0WyRzb3VyY2VdYCBzbyBubyBtb3JlIGBtZXNzYWdlc2Agd2lsbCBiZSByZWNlaXZlZC5cbklucHV0LnN0b3AgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgc291cmNlID0gaW5wdXRbJHNvdXJjZV1cbiAgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIGlucHV0KVxufVxuXG4vLyBgSW5wdXQuY29ubmVjdGAgaXMgaW52b2tlZCB3aXRoIGBpbnB1dGAgYW5kIGBvdXRwdXRgLiBUaGlzXG4vLyBpbXBsZW1lbnRhdGlvbiBwdXQncyBgb3V0cHV0YCB0byBpdCdzIGAkb3V0cHV0YCBwb3J0cyB0b1xuLy8gZGVsZWdhdGUgcmVjZWl2ZWQgYG1lc3NhZ2VzYCB0byBpdC5cbklucHV0LmNvbm5lY3QgPSBmdW5jdGlvbihpbnB1dCwgb3V0cHV0KSB7XG4gIHZhciBvdXRwdXRzID0gaW5wdXRbJG91dHB1dHNdXG4gIGlmIChvdXRwdXRzLmluZGV4T2Yob3V0cHV0KSA8IDApIHtcbiAgICBvdXRwdXRzLnB1c2gob3V0cHV0KVxuICAgIGlmIChvdXRwdXRzLmxlbmd0aCA9PT0gMSlcbiAgICAgIGlucHV0WyRzdGFydF0oaW5wdXQpXG4gIH1cbn1cblxuLy8gYElucHV0LmRpc2Nvbm5lY3RgIGlzIGludm9rZWQgd2l0aCBgaW5wdXRgIGFuZCBhbiBgb3V0cHV0YFxuLy8gY29ubmVjdGVkIHRvIGl0LiBBZnRlciB0aGlzIHBvaW50IGBvdXRwdXRgIHNob3VsZCBub3QgbG9uZ2VyXG4vLyByZWNlaXZlIG1lc3NhZ2VzIGZyb20gdGhlIGBpbnB1dGAuIElmIGl0J3MgYSBsYXN0IGBvdXRwdXRgXG4vLyBgaW5wdXRgIHdpbGwgYmUgc3RvcHBlZC5cbklucHV0LmRpc2Nvbm5lY3QgPSBmdW5jdGlvbihpbnB1dCwgb3V0cHV0KSB7XG4gIHZhciBvdXRwdXRzID0gaW5wdXRbJG91dHB1dHNdXG4gIHZhciBpbmRleCA9IG91dHB1dHMuaW5kZXhPZihvdXRwdXQpXG4gIGlmIChpbmRleCA+PSAwKSB7XG4gICAgb3V0cHV0cy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgaWYgKG91dHB1dHMubGVuZ3RoID09PSAwKVxuICAgICAgaW5wdXRbJHN0b3BdKGlucHV0KVxuICB9XG59XG5cbi8vIGBJbnB1dC5Qb3J0YCBjcmVhdGVzIGEgbWVzc2FnZSByZWNlaXZlciBwb3J0LiBgSW5wdXRgIGluc3RhbmNlcyBzdXBwb3J0XG4vLyBgbWVzc2FnZWAsIGBlcnJvcmAsIGBlbmRgIHBvcnRzLlxuSW5wdXQuUG9ydCA9IGZ1bmN0aW9uKHBvcnQpIHtcbiAgdmFyIGlzRXJyb3IgPSBwb3J0ID09PSAkZXJyb3JcbiAgdmFyIGlzRW5kID0gcG9ydCA9PT0gJGVuZFxuICB2YXIgaXNNZXNzYWdlID0gcG9ydCA9PT0gJHJlY2VpdmVcblxuICAvLyBGdW5jdGlvbiB3aWxsIHdyaXRlIGBtZXNzYWdlYCB0byBhIGdpdmVuIGBpbnB1dGAuIFRoaXMgbWVhbnNcbiAgLy8gaXQgd2lsbCBkZWxlZ2VhdGUgbWVzc2FnZXMgdG8gaXQncyBgaW5wdXRbJG91dHB1dHNdYCBwb3J0cy5cbiAgcmV0dXJuIGZ1bmN0aW9uIHdyaXRlKGlucHV0LCBtZXNzYWdlKSB7XG4gICAgdmFyIG91dHB1dHMgPSBpbnB1dFskb3V0cHV0c11cbiAgICB2YXIgcmVzdWx0ID0gdm9pZCgwKVxuICAgIHZhciBjb3VudCA9IG91dHB1dHMubGVuZ3RoXG4gICAgdmFyIGluZGV4ID0gMFxuXG4gICAgLy8gTm90ZTogZGlzcGF0Y2ggbG9vcCBkZWNyZWFzZXMgY291bnQgb3IgaW5jcmVhc2VzIGluZGV4IGFzIG5lZWRlZC5cbiAgICAvLyBUaGlzIG1ha2VzIHN1cmUgdGhhdCBuZXcgY29ubmVjdGlvbnMgd2lsbCBub3QgcmVjZWl2ZSBtZXNzYWdlc1xuICAgIC8vIHVudGlsIG5leHQgZGlzcGF0Y2ggbG9vcCAmIGludGVudGlvbmFsbHkgc28uXG4gICAgd2hpbGUgKGluZGV4IDwgb3V0cHV0cy5sZW5ndGgpIHtcbiAgICAgIC8vIEF0dGVtcHQgdG8gc2VuZCBhIHZhbHVlIHRvIGEgY29ubmVjdGVkIGBvdXRwdXRgLiBJZiB0aGlzIGlzXG4gICAgICAvLyBgJGVuZGAgYHBvcnRgIHJldHVybiBgQnJlYWtgIHRvIGNhdXNlIGBvdXRwdXRgIHRvIGJlXG4gICAgICAvLyBkaXNjb25uZWN0ZWQuIElmIGFueSBvdGhlciBgcG9ydGAganVzdCBkZWxpdmVyIGEgYG1lc3NhZ2VgLlxuICAgICAgdmFyIG91dHB1dCA9IG91dHB1dHNbaW5kZXhdXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBpc0VuZCA/IG91dHB1dFtwb3J0XShvdXRwdXQsIGlucHV0KSA6XG4gICAgICAgICAgICAgICAgIG91dHB1dFtwb3J0XShvdXRwdXQsIG1lc3NhZ2UsIGlucHV0KVxuICAgICAgfVxuICAgICAgY2F0Y2ggKHJlYXNvbikge1xuICAgICAgICB0aHJvdyByZWFzb25cbiAgICAgICAgLy8gSWYgZXhjZXB0aW9uIHdhcyB0aHJvd24gYW5kIGBtZXNzYWdlYCB3YXMgc2VuZCB0byBgJGVycm9yYFxuICAgICAgICAvLyBgcG9ydGAgZ2l2ZSB1cCBhbmQgbG9nIGVycm9yLlxuICAgICAgICBpZiAoaXNFcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVjZWl2ZSBhbiBlcnJvciBtZXNzYWdlXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uKVxuICAgICAgICB9XG4gICAgICAgIC8vIElmIGV4Y2VwdGlvbiB3YXMgdGhyb3duIHdoZW4gd3JpdGluZyB0byBhIGRpZmZlcmVudCBgcG9ydGBcbiAgICAgICAgLy8gYXR0ZW1wdCB0byB3cml0ZSB0byBhbiBgJGVycm9yYCBgcG9ydGAgb2YgdGhlIGBvdXRwdXRgLlxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gb3V0cHV0WyRlcnJvcl0ob3V0cHV0LCByZWFzb24sIGlucHV0KVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBJZiBleGNlcHRpb24gaXMgc3RpbGwgdGhyb3duIHdoZW4gd3JpdGluZyB0byBhbiBgJGVycm9yYFxuICAgICAgICAgIC8vIGBwb3J0YCBnaXZlIHVwIGFuZCBsb2cgYGVycm9yYC5cbiAgICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJGYWlsZWQgdG8gcmVjZWl2ZSBtZXNzYWdlICYgYW4gZXJyb3JcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhc29uLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIHJlc3VsdCBvZiBzZW5kaW5nIGBtZXNzYWdlYCB0byBhbiBgb3V0cHV0YCB3YXMgaW5zdGFuY2VcbiAgICAgIC8vIG9mIGBCcmVha2AsIGRpc2Nvbm5lY3QgdGhhdCBgb3V0cHV0YCBzbyBpdCBubyBsb25nZXIgZ2V0J3NcbiAgICAgIC8vIG1lc3NhZ2VzLiBOb3RlIGBpbmRleGAgaXMgZGVjcmVtZW50ZWQgYXMgZGlzY29ubmVjdCB3aWxsXG4gICAgICAvLyByZW1vdmUgaXQgZnJvbSBgb3V0cHV0c2AuXG4gICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgQnJlYWsgfHwgaXNFbmQpIHtcbiAgICAgICAgaW5wdXRbJGRpc2Nvbm5lY3RdKGlucHV0LCBvdXRwdXQpXG4gICAgICB9XG4gICAgICAvLyBPbiBhbnkgb3RoZXIgYHJlc3VsdGAganVzdCBtb3ZlIHRvIGEgbmV4dCBvdXRwdXQuXG4gICAgICBlbHNlIHtcbiAgICAgICAgaW5kZXggPSBpbmRleCArIDFcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPbmNlIG1lc3NhZ2Ugd2FzIHdyaXR0ZW4gdG8gYWxsIG91dHB1dHMgdXBkYXRlIGB2YWx1ZWAgb2ZcbiAgICAvLyB0aGUgaW5wdXQuXG4gICAgaWYgKGlzTWVzc2FnZSlcbiAgICAgIGlucHV0LnZhbHVlID0gbWVzc2FnZVxuXG4gICAgaWYgKGNvdW50ID09PSAwICYmIGlzRW5kKVxuICAgICAgaW5wdXRbJHN0b3BdKGlucHV0KVxuICB9XG59XG5cbi8vIElucHV0cyBoYXZlIGBtZXNzYWdlYCwgYGVycm9yYCBhbmQgYGVuZGAgcG9ydHNcbklucHV0LnJlY2VpdmUgPSBJbnB1dC5Qb3J0KCRyZWNlaXZlKVxuSW5wdXQuZXJyb3IgPSBJbnB1dC5Qb3J0KCRlcnJvcilcbklucHV0LmVuZCA9IElucHV0LlBvcnQoJGVuZClcblxuLy8gU2FtZSBBUEkgZnVuY3Rpb25zIGFyZSBzYXZlZCBpbiB0aGUgcHJvdG90eXBlIGluIG9yZGVyIHRvIGVuYWJsZVxuLy8gcG9seW1vcnBoaWMgZGlzcGF0Y2guXG5JbnB1dC5wcm90b3R5cGVbJHN0YXJ0XSA9IElucHV0LnN0YXJ0XG5JbnB1dC5wcm90b3R5cGVbJHN0b3BdID0gSW5wdXQuc3RvcFxuSW5wdXQucHJvdG90eXBlWyRjb25uZWN0XSA9IElucHV0LmNvbm5lY3RcbklucHV0LnByb3RvdHlwZVskZGlzY29ubmVjdF0gPSBJbnB1dC5kaXNjb25uZWN0XG5JbnB1dC5wcm90b3R5cGVbJHJlY2VpdmVdID0gSW5wdXQucmVjZWl2ZVxuSW5wdXQucHJvdG90eXBlWyRlcnJvcl0gPSBJbnB1dC5lcnJvclxuSW5wdXQucHJvdG90eXBlWyRlbmRdID0gSW5wdXQuZW5kXG5JbnB1dC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7IHZhbHVlOiB0aGlzLnZhbHVlIH1cbn1cblxuZnVuY3Rpb24gQ29uc3RhbnQodmFsdWUpIHtcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5Db25zdGFudC5pZ25vcmUgPSBmdW5jdGlvbigpIHt9XG5cbkNvbnN0YW50LnByb3RvdHlwZSA9IG5ldyBJbnB1dCgpXG5Db25zdGFudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb25zdGFudFxuQ29uc3RhbnQucHJvdG90eXBlWyRzdGFydF0gPSBDb25zdGFudC5pZ25vcmVcbkNvbnN0YW50LnByb3RvdHlwZVskc3RvcF0gPSBDb25zdGFudC5pZ25vcmVcbkNvbnN0YW50LnByb3RvdHlwZVskY29ubmVjdF0gPSBDb25zdGFudC5pZ25vcmVcbkNvbnN0YW50LnByb3RvdHlwZVskZGlzY29ubmVjdF0gPSBDb25zdGFudC5pZ25vcmVcbkNvbnN0YW50LnByb3RvdHlwZVskcmVjZWl2ZV0gPSBDb25zdGFudC5pZ25vcmVcbkNvbnN0YW50LnByb3RvdHlwZVskZXJyb3JdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGVuZF0gPSBDb25zdGFudC5pZ25vcmVcblxuXG4vLyBDcmVhdGUgYSBjb25zdGFudCBzaWduYWwgdGhhdCBuZXZlciBjaGFuZ2VzLlxuXG4vLyBhIC0+IFNpZ25hbCBhXG5cbmZ1bmN0aW9uIGNvbnN0YW50KHZhbHVlKSB7XG4gIHJldHVybiBuZXcgQ29uc3RhbnQodmFsdWUpXG59XG5leHBvcnRzLmNvbnN0YW50ID0gY29uc3RhbnRcblxuXG5mdW5jdGlvbiBNZXJnZShpbnB1dHMpIHtcbiAgdGhpc1skb3V0cHV0c10gPSBbXVxuICB0aGlzWyRzb3VyY2VzXSA9IGlucHV0c1xuICB0aGlzWyRwZW5kaW5nXSA9IGlucHV0cy5sZW5ndGhcbiAgdGhpcy52YWx1ZSA9IGlucHV0c1swXS52YWx1ZVxufVxuTWVyZ2Uuc3RhcnQgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgc291cmNlcyA9IGlucHV0WyRzb3VyY2VzXVxuICB2YXIgY291bnQgPSBzb3VyY2VzLmxlbmd0aFxuICB2YXIgaWQgPSAwXG5cbiAgd2hpbGUgKGlkIDwgY291bnQpIHtcbiAgICB2YXIgc291cmNlID0gc291cmNlc1tpZF1cbiAgICBzb3VyY2VbJGNvbm5lY3RdKHNvdXJjZSwgaW5wdXQpXG4gICAgaWQgPSBpZCArIDFcbiAgfVxufVxuTWVyZ2Uuc3RvcCA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIHZhciBpbnB1dHMgPSBpbnB1dFskc291cmNlc11cbiAgdmFyIGNvdW50ID0gaW5wdXRzLmxlbmd0aFxuICB2YXIgaWQgPSAwXG4gIHdoaWxlIChpZCA8IGNvdW50KSB7XG4gICAgdmFyIHNvdXJjZSA9IGlucHV0c1tpZF1cbiAgICBzb3VyY2VbJGRpc2Nvbm5lY3RdKHNvdXJjZSwgaW5wdXQpXG4gICAgaWQgPSBpZCArIDFcbiAgfVxufVxuTWVyZ2UuZW5kID0gZnVuY3Rpb24oaW5wdXQsIHNvdXJjZSkge1xuICB2YXIgc291cmNlcyA9IGlucHV0WyRzb3VyY2VzXVxuICB2YXIgaWQgPSBzb3VyY2VzLmluZGV4T2Yoc291cmNlKVxuICBpZiAoaWQgPj0gMCkge1xuICAgIHZhciBwZW5kaW5nID0gaW5wdXRbJHBlbmRpbmddIC0gMVxuICAgIGlucHV0WyRwZW5kaW5nXSA9IHBlbmRpbmdcbiAgICBzb3VyY2VbJGRpc2Nvbm5lY3RdKHNvdXJjZSwgaW5wdXQpXG5cbiAgICBpZiAocGVuZGluZyA9PT0gMClcbiAgICAgIElucHV0LmVuZChpbnB1dClcbiAgfVxufVxuXG5NZXJnZS5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuTWVyZ2UucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTWVyZ2Vcbk1lcmdlLnByb3RvdHlwZVskc3RhcnRdID0gTWVyZ2Uuc3RhcnRcbk1lcmdlLnByb3RvdHlwZVskc3RvcF0gPSBNZXJnZS5zdG9wXG5NZXJnZS5wcm90b3R5cGVbJGVuZF0gPSBNZXJnZS5lbmRcblxuLy8gTWVyZ2UgdHdvIHNpZ25hbHMgaW50byBvbmUsIGJpYXNlZCB0b3dhcmRzIHRoZVxuLy8gZmlyc3Qgc2lnbmFsIGlmIGJvdGggc2lnbmFscyB1cGRhdGUgYXQgdGhlIHNhbWUgdGltZS5cblxuLy8gU2lnbmFsIHggLT4gU2lnbmFsIHkgLT4gLi4uIC0+IFNpZ25hbCB6XG5mdW5jdGlvbiBtZXJnZSgpIHtcbiAgcmV0dXJuIG5ldyBNZXJnZShzbGljZXIuY2FsbChhcmd1bWVudHMsIDApKVxufVxuZXhwb3J0cy5tZXJnZSA9IG1lcmdlXG5cblxuLy8gTWVyZ2UgbWFueSBzaWduYWxzIGludG8gb25lLCBiaWFzZWQgdG93YXJkcyB0aGVcbi8vIGxlZnQtbW9zdCBzaWduYWwgaWYgbXVsdGlwbGUgc2lnbmFscyB1cGRhdGUgc2ltdWx0YW5lb3VzbHkuXG5mdW5jdGlvbiBtZXJnZXMoaW5wdXRzKSB7XG4gIHJldHVybiBuZXcgTWVyZ2UoaW5wdXRzKVxufVxuZXhwb3J0cy5tZXJnZXMgPSBtZXJnZXNcblxuXG4vLyAjIFBhc3QtRGVwZW5kZW5jZVxuXG4vLyBDcmVhdGUgYSBwYXN0LWRlcGVuZGVudCBzaWduYWwuIEVhY2ggdmFsdWUgZ2l2ZW4gb24gdGhlIGlucHV0IHNpZ25hbFxuLy8gd2lsbCBiZSBhY2N1bXVsYXRlZCwgcHJvZHVjaW5nIGEgbmV3IG91dHB1dCB2YWx1ZS5cblxuZnVuY3Rpb24gRm9sZFAoc3RlcCwgdmFsdWUsIGlucHV0KSB7XG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlXSA9IGlucHV0XG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxuICB0aGlzLnN0ZXAgPSBzdGVwXG59XG5Gb2xkUC5yZWNlaXZlID0gZnVuY3Rpb24oaW5wdXQsIG1lc3NhZ2UsIHNvdXJjZSkge1xuICBJbnB1dC5yZWNlaXZlKGlucHV0LCBpbnB1dC5zdGVwKGlucHV0LnZhbHVlLCBtZXNzYWdlKSlcbn1cblxuRm9sZFAucHJvdG90eXBlID0gbmV3IElucHV0KClcbkZvbGRQLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZvbGRQXG5Gb2xkUC5wcm90b3R5cGVbJHJlY2VpdmVdID0gRm9sZFAucmVjZWl2ZVxuXG5cbmZ1bmN0aW9uIGZvbGRwKHN0ZXAsIHgsIHhzKSB7XG4gIHJldHVybiBuZXcgRm9sZFAoc3RlcCwgeCwgeHMpXG59XG5leHBvcnRzLmZvbGRwID0gZm9sZHBcblxuXG4vLyBPcHRpbWl6ZWQgdmVyc2lvbiB0aGF0IHRyYWNrcyBzaW5nbGUgaW5wdXQuXG5mdW5jdGlvbiBMaWZ0KHN0ZXAsIGlucHV0KSB7XG4gIHRoaXMuc3RlcCA9IHN0ZXBcbiAgdGhpc1skc291cmNlXSA9IGlucHV0XG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpcy52YWx1ZSA9IHN0ZXAoaW5wdXQudmFsdWUpXG59XG5MaWZ0LnJlY2VpdmUgPSBmdW5jdGlvbihpbnB1dCwgbWVzc2FnZSkge1xuICBJbnB1dC5yZWNlaXZlKGlucHV0LCBpbnB1dC5zdGVwKG1lc3NhZ2UpKVxufVxuXG5MaWZ0LnByb3RvdHlwZSA9IG5ldyBJbnB1dCgpXG5MaWZ0LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExpZnRcbkxpZnQucHJvdG90eXBlWyRyZWNlaXZlXSA9IExpZnQucmVjZWl2ZVxuXG5mdW5jdGlvbiBMaWZ0TihzdGVwLCBpbnB1dHMpIHtcbiAgdmFyIGNvdW50ID0gaW5wdXRzLmxlbmd0aFxuICB2YXIgaWQgPSAwXG4gIHZhciBwYXJhbXMgPSBBcnJheShjb3VudClcbiAgd2hpbGUgKGlkIDwgY291bnQpIHtcbiAgICB2YXIgaW5wdXQgPSBpbnB1dHNbaWRdXG4gICAgcGFyYW1zW2lkXSA9IGlucHV0LnZhbHVlXG4gICAgaWQgPSBpZCArIDFcbiAgfVxuICB2YXIgdmFsdWUgPSBzdGVwLmFwcGx5KHN0ZXAsIHBhcmFtcylcblxuICB0aGlzLnN0ZXAgPSBzdGVwXG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlc10gPSBpbnB1dHNcbiAgdGhpc1skcGVuZGluZ10gPSBpbnB1dHMubGVuZ3RoXG4gIHRoaXNbJHN0YXRlXSA9IHBhcmFtc1xuICB0aGlzLnZhbHVlID0gdmFsdWVcbn1cbkxpZnROLnN0YXJ0ID0gTWVyZ2Uuc3RhcnRcbkxpZnROLnN0b3AgPSBNZXJnZS5zdG9wXG5MaWZ0Ti5lbmQgPSBNZXJnZS5lbmRcblxuXG5MaWZ0Ti5yZWNlaXZlID0gZnVuY3Rpb24oaW5wdXQsIG1lc3NhZ2UsIHNvdXJjZSkge1xuICB2YXIgcGFyYW1zID0gaW5wdXRbJHN0YXRlXVxuICB2YXIgaW5kZXggPSBpbnB1dFskc291cmNlc10uaW5kZXhPZihzb3VyY2UpXG4gIHZhciBzdGVwID0gaW5wdXQuc3RlcFxuICBwYXJhbXNbaW5kZXhdID0gbWVzc2FnZVxuICByZXR1cm4gSW5wdXQucmVjZWl2ZShpbnB1dCwgc3RlcC5hcHBseShzdGVwLCBwYXJhbXMpKVxufVxuXG5MaWZ0Ti5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuTGlmdE4ucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTGlmdE5cbkxpZnROLnByb3RvdHlwZVskc3RhcnRdID0gTGlmdE4uc3RhcnRcbkxpZnROLnByb3RvdHlwZVskc3RvcF0gPSBMaWZ0Ti5zdG9wXG5MaWZ0Ti5wcm90b3R5cGVbJGVuZF0gPSBMaWZ0Ti5lbmRcbkxpZnROLnByb3RvdHlwZVskcmVjZWl2ZV0gPSBMaWZ0Ti5yZWNlaXZlXG5cbnZhciBzbGljZXIgPSBbXS5zbGljZVxuXG4vLyBUcmFuc2Zvcm0gZ2l2ZW4gc2lnbmFsKHMpIHdpdGggYSBnaXZlbiBgc3RlcGAgZnVuY3Rpb24uXG5cbi8vICh4IC0+IHkgLT4gLi4uKSAtPiBTaWduYWwgeCAtPiBTaWduYWwgeSAtPiAuLi4gLT4gU2lnbmFsIHpcbi8vXG4vLyB4cyAgICAgICAgICAgICAgOi0teC0tLS0teC0tLS0teC0tLVxuLy8gbGlmdChmLCB4cykgICAgIDotLWYoeCktLWYoeCktLWYoeClcbi8vXG4vLyB4cyAgICAgICAgICAgICAgOi0teC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0teC0tLS0tLS1cbi8vIHlzICAgICAgICAgICAgICA6LS0tLS0tLS0tLS15LS0tLS0tLS0teS0tLS0tLS0tLS0tLS0tLVxuLy8gbGlmdChmLCB4cywgeXMpIDotLWYoeCwgeSktLWYoeCwgeSktLWYoeCwgeSktLWYoeCwgeSktXG5mdW5jdGlvbiBsaWZ0KHN0ZXAsIHhzLCB5cykge1xuICByZXR1cm4geXMgPyBuZXcgTGlmdE4oc3RlcCwgc2xpY2VyLmNhbGwoYXJndW1lbnRzLCAxKSkgOlxuICAgICAgICAgbmV3IExpZnQoc3RlcCwgeHMpXG59XG5leHBvcnRzLmxpZnQgPSBsaWZ0XG5leHBvcnRzLmxpZnQyID0gbGlmdFxuZXhwb3J0cy5saWZ0MyA9IGxpZnRcbmV4cG9ydHMubGlmdDQgPSBsaWZ0XG5leHBvcnRzLmxpZnQ1ID0gbGlmdFxuZXhwb3J0cy5saWZ0NiA9IGxpZnRcbmV4cG9ydHMubGlmdDcgPSBsaWZ0XG5leHBvcnRzLmxpZnQ4ID0gbGlmdFxuZXhwb3J0cy5saWZ0TiA9IGxpZnRcblxuXG4vLyBDb21iaW5lIGEgYXJyYXkgb2Ygc2lnbmFscyBpbnRvIGEgc2lnbmFsIG9mIGFycmF5cy5cbmZ1bmN0aW9uIGNvbWJpbmUoaW5wdXRzKSB7XG4gIHJldHVybiBuZXcgTGlmdE4oQXJyYXksIGlucHV0cylcbn1cbmV4cG9ydHMuY29tYmluZSA9IGNvbWJpbmVcblxuXG5cbi8vIENvdW50IHRoZSBudW1iZXIgb2YgZXZlbnRzIHRoYXQgaGF2ZSBvY2N1cmVkLlxuXG4vLyBTaWduYWwgeCAtPiBTaWduYWwgSW50XG4vL1xuLy8geHMgICAgICAgOiAgLS14LS14LS0tLXgtLXgtLS0tLS14XG4vLyBjb3VudCh4cyk6ICAtLTEtLTItLS0tMy0tNC0tLS0tLTVcbmZ1bmN0aW9uIGNvdW50KHhzKSB7XG4gIHJldHVybiBmb2xkcChmdW5jdGlvbih4LCB5KSB7XG4gICAgcmV0dXJuIHggKyAxXG4gIH0sIDAsIHhzKVxufVxuZXhwb3J0cy5jb3VudCA9IGNvdW50XG5cbi8vIENvdW50IHRoZSBudW1iZXIgb2YgZXZlbnRzIHRoYXQgaGF2ZSBvY2N1cmVkIHRoYXRcbi8vIHNhdGlzZnkgYSBnaXZlbiBwcmVkaWNhdGUuXG5cbi8vICh4IC0+IEJvb2wpIC0+IFNpZ25hbCB4IC0+IFNpZ25hbCBJbnRcbmZ1bmN0aW9uIGNvdW50SWYocCwgeHMpIHtcbiAgcmV0dXJuIGNvdW50KGtlZXBJZihwLCB4cy52YWx1ZSwgeHMpKVxufVxuZXhwb3J0cy5jb3VudElmID0gY291bnRJZlxuXG4vLyAjIEZpbHRlcnNcblxuZnVuY3Rpb24gS2VlcElmKHAsIHZhbHVlLCBpbnB1dCkge1xuICB0aGlzLnAgPSBwXG4gIHRoaXMudmFsdWUgPSBwKGlucHV0LnZhbHVlKSA/IGlucHV0LnZhbHVlIDogdmFsdWVcbiAgdGhpc1skb3V0cHV0c10gPSBbXVxuICB0aGlzWyRzb3VyY2VdID0gaW5wdXRcbn1cbktlZXBJZi5yZWNlaXZlID0gZnVuY3Rpb24oaW5wdXQsIG1lc3NhZ2UpIHtcbiAgaWYgKGlucHV0LnAobWVzc2FnZSkpXG4gICAgSW5wdXQucmVjZWl2ZShpbnB1dCwgbWVzc2FnZSlcbn1cbktlZXBJZi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBLZWVwSWZcbktlZXBJZi5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuS2VlcElmLnByb3RvdHlwZVskcmVjZWl2ZV0gPSBLZWVwSWYucmVjZWl2ZVxuXG4vLyBLZWVwIG9ubHkgZXZlbnRzIHRoYXQgc2F0aXNmeSB0aGUgZ2l2ZW4gcHJlZGljYXRlLlxuLy8gRWxtIGRvZXMgbm90IGFsbG93IHVuZGVmaW5lZCBzaWduYWxzLCBzbyBhIGJhc2UgY2FzZVxuLy8gbXVzdCBiZSBwcm92aWRlZCBpbiBjYXNlIHRoZSBwcmVkaWNhdGUgaXMgbmV2ZXIgc2F0aXNmaWVkLlxuXG4vLyAoeCAtPiBCb29sKSAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBrZWVwSWYocCwgeCwgeHMpIHtcbiAgcmV0dXJuIG5ldyBLZWVwSWYocCwgeCwgeHMpXG59XG5leHBvcnRzLmtlZXBJZiA9IGtlZXBJZlxuXG5cbmZ1bmN0aW9uIERyb3BJZihwLCB2YWx1ZSwgaW5wdXQpIHtcbiAgdGhpcy5wID0gcFxuICB0aGlzLnZhbHVlID0gcChpbnB1dC52YWx1ZSkgPyB2YWx1ZSA6IGlucHV0LnZhbHVlXG4gIHRoaXNbJHNvdXJjZV0gPSBpbnB1dFxuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG59XG5Ecm9wSWYucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlKSB7XG4gIGlmICghaW5wdXQucChtZXNzYWdlKSlcbiAgICBJbnB1dC5yZWNlaXZlKGlucHV0LCBtZXNzYWdlKVxufVxuRHJvcElmLnByb3RvdHlwZSA9IG5ldyBJbnB1dCgpXG5Ecm9wSWYucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRHJvcElmXG5Ecm9wSWYucHJvdG90eXBlWyRyZWNlaXZlXSA9IERyb3BJZi5yZWNlaXZlXG5cbi8vIERyb3AgZXZlbnRzIHRoYXQgc2F0aXNmeSB0aGUgZ2l2ZW4gcHJlZGljYXRlLiBFbG0gZG9lcyBub3QgYWxsb3dcbi8vIHVuZGVmaW5lZCBzaWduYWxzLCBzbyBhIGJhc2UgY2FzZSBtdXN0IGJlIHByb3ZpZGVkIGluIGNhc2UgdGhlXG4vLyBwcmVkaWNhdGUgaXMgbmV2ZXIgc2F0aXNmaWVkLlxuXG4vLyAoeCAtPiBCb29sKSAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBkcm9wSWYocCwgeCwgeHMpIHtcbiAgcmV0dXJuIG5ldyBEcm9wSWYocCwgeCwgeHMpXG59XG5leHBvcnRzLmRyb3BJZiA9IGRyb3BJZlxuXG5cbi8vIEtlZXAgZXZlbnRzIG9ubHkgd2hlbiB0aGUgZmlyc3Qgc2lnbmFsIGlzIHRydWUuIFdoZW4gdGhlIGZpcnN0IHNpZ25hbFxuLy8gYmVjb21lcyB0cnVlLCB0aGUgbW9zdCByZWNlbnQgdmFsdWUgb2YgdGhlIHNlY29uZCBzaWduYWwgd2lsbCBiZSBwcm9wYWdhdGVkLlxuLy8gVW50aWwgdGhlIGZpcnN0IHNpZ25hbCBiZWNvbWVzIGZhbHNlIGFnYWluLCBhbGwgZXZlbnRzIHdpbGwgYmUgcHJvcGFnYXRlZC5cbi8vIEVsbSBkb2VzIG5vdCBhbGxvdyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlIGNhc2UgbXVzdCBiZSBwcm92aWRlZCBpbiBjYXNlXG4vLyB0aGUgZmlyc3Qgc2lnbmFsIGlzIG5ldmVyIHRydWUuXG5cbi8vIFNpZ25hbCBCb29sIC0+IHggLT4gU2lnbmFsIHggLT4gU2lnbmFsIHhcbmZ1bmN0aW9uIFNraXAoKSB7IHJldHVybiBTa2lwIH1cbmZ1bmN0aW9uIGlzU2tpcCh4KSB7IHJldHVybiB4ID09PSBTa2lwIH1cbmZ1bmN0aW9uIHNraXBJZlRydWUoaXNUcnVlLCB4KSB7IHJldHVybiBpc1RydWUgPyBTa2lwIDogeCB9XG5mdW5jdGlvbiBza2lwSWZGYWxzZShpc1RydWUsIHgpIHsgcmV0dXJuIGlzVHJ1ZSA/IHggOiBTa2lwIH1cblxuZnVuY3Rpb24ga2VlcFdoZW4oc3RhdGUsIHgsIHhzKSB7XG4gIHZhciBpbnB1dCA9IGxpZnQoc2tpcElmRmFsc2UsIGRyb3BSZXBlYXRzKHN0YXRlKSwgeHMpXG4gIHJldHVybiBkcm9wSWYoaXNTa2lwLCB4LCBpbnB1dClcbn1cbmV4cG9ydHMua2VlcFdoZW4gPSBrZWVwV2hlblxuXG4vLyBEcm9wIGV2ZW50cyB3aGVuIHRoZSBmaXJzdCBzaWduYWwgaXMgdHJ1ZS4gV2hlbiB0aGUgZmlyc3Qgc2lnbmFsXG4vLyBiZWNvbWVzIGZhbHNlLCB0aGUgbW9zdCByZWNlbnQgdmFsdWUgb2YgdGhlIHNlY29uZCBzaWduYWwgd2lsbCBiZVxuLy8gcHJvcGFnYXRlZC4gVW50aWwgdGhlIGZpcnN0IHNpZ25hbCBiZWNvbWVzIHRydWUgYWdhaW4sIGFsbCBldmVudHNcbi8vIHdpbGwgYmUgcHJvcGFnYXRlZC4gRWxtIGRvZXMgbm90IGFsbG93IHVuZGVmaW5lZCBzaWduYWxzLCBzbyBhIGJhc2Vcbi8vIGNhc2UgbXVzdCBiZSBwcm92aWRlZCBpbiBjYXNlIHRoZSBmaXJzdCBzaWduYWwgaXMgYWx3YXlzIHRydWUuXG5cbi8vIFNpZ25hbCBCb29sIC0+IHggLT4gU2lnbmFsIHggLT4gU2lnbmFsIHhcbmZ1bmN0aW9uIGRyb3BXaGVuKHN0YXRlLCB4LCB4cykge1xuICB2YXIgaW5wdXQgPSBsaWZ0KHNraXBJZlRydWUsIGRyb3BSZXBlYXRzKHN0YXRlKSwgeHMpXG4gIHJldHVybiBkcm9wSWYoaXNTa2lwLCB4LCBpbnB1dClcbn1cbmV4cG9ydHMuZHJvcFdoZW4gPSBkcm9wV2hlblxuXG4vLyBEcm9wIHNlcXVlbnRpYWwgcmVwZWF0ZWQgdmFsdWVzLiBGb3IgZXhhbXBsZSwgaWYgYSBzaWduYWwgcHJvZHVjZXNcbi8vIHRoZSBzZXF1ZW5jZSBbMSwxLDIsMiwxXSwgaXQgYmVjb21lcyBbMSwyLDFdIGJ5IGRyb3BwaW5nIHRoZSB2YWx1ZXNcbi8vIHRoYXQgYXJlIHRoZSBzYW1lIGFzIHRoZSBwcmV2aW91cyB2YWx1ZS5cblxuLy8gU2lnbmFsIHggLT4gU2lnbmFsIHhcbmZ1bmN0aW9uIGRyb3BSZXBlYXRzKHhzKSB7XG4gIHJldHVybiBkcm9wSWYoZnVuY3Rpb24oeCkge1xuICAgIHJldHVybiB4cy52YWx1ZSA9PT0geFxuICB9LCB4cy52YWx1ZSwgeHMpXG59XG5leHBvcnRzLmRyb3BSZXBlYXRzID0gZHJvcFJlcGVhdHNcblxuLy8gU2FtcGxlIGZyb20gdGhlIHNlY29uZCBpbnB1dCBldmVyeSB0aW1lIGFuIGV2ZW50IG9jY3VycyBvbiB0aGUgZmlyc3Rcbi8vIGlucHV0LiBGb3IgZXhhbXBsZSwgKHNhbXBsZU9uIGNsaWNrcyAoZXZlcnkgc2Vjb25kKSkgd2lsbCBnaXZlIHRoZVxuLy8gYXBwcm94aW1hdGUgdGltZSBvZiB0aGUgbGF0ZXN0IGNsaWNrLlxuXG4vLyBTaWduYWwgYSAtPiBTaWduYWwgYiAtPiBTaWduYWwgYlxuZnVuY3Rpb24gc2FtcGxlT24odGlja3MsIGlucHV0KSB7XG4gIHJldHVybiBtZXJnZShkcm9wSWYoVHJ1ZSwgaW5wdXQudmFsdWUsIGlucHV0KSxcbiAgICAgICAgICAgICAgIGxpZnQoZnVuY3Rpb24oXykgeyByZXR1cm4gaW5wdXQudmFsdWUgfSwgdGlja3MpKVxufVxuZXhwb3J0cy5zYW1wbGVPbiA9IHNhbXBsZU9uXG5cbmZ1bmN0aW9uIFRydWUoKSB7IHJldHVybiB0cnVlIH1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgSW5wdXQgPSByZXF1aXJlKFwicmVmbGV4L3NpZ25hbFwiKS5JbnB1dFxudmFyIG9uSW5wdXQgPSByZXF1aXJlKFwicmVmbGV4L2V2ZW50XCIpLm9uSW5wdXRcbnZhciBub2RlID0gcmVxdWlyZShcInJlZmxleC9odG1sXCIpLm5vZGVcbnZhciBldmVudE5vZGUgPSByZXF1aXJlKFwicmVmbGV4L2h0bWxcIikuZXZlbnROb2RlXG52YXIgdGV4dCA9IHJlcXVpcmUoXCJyZWZsZXgvaHRtbFwiKS50ZXh0XG52YXIgbGlmdCA9IHJlcXVpcmUoXCJyZWZsZXgvc2lnbmFsXCIpLmxpZnRcbnZhciBmb2xkcCA9IHJlcXVpcmUoXCJyZWZsZXgvc2lnbmFsXCIpLmZvbGRwXG52YXIgYXBwID0gcmVxdWlyZShcInJlZmxleC9hcHBcIikuYXBwXG5cblxudmFyIGFjdGlvbnMgPSBuZXcgSW5wdXQoKVxuXG52YXIgaW5pdCA9IHsgZmllbGQ6IFwiXCIgfVxuXG52YXIgQWN0aW9ucyA9IHtcbiAgTm9PcDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4gc3RhdGVcbiAgICB9XG4gIH0sXG4gIFVwZGF0ZUZpZWxkOiBmdW5jdGlvbih0ZXh0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKHN0YXRlKSB7XG4gICAgICByZXR1cm4ge2ZpZWxkOiB0ZXh0fVxuICAgIH1cbiAgfVxufVxuXG5cbi8vIHN0ZXAgOiBTdGF0ZSAtPiBBY3Rpb24gLT4gU3RhdGVcbnZhciBzdGVwID0gZnVuY3Rpb24oc3RhdGUsIGFjdGlvbikge1xuICByZXR1cm4gYWN0aW9uKHN0YXRlKVxufVxuXG52YXIgc3RhdGUgPSBmb2xkcChzdGVwLCBpbml0LCBhY3Rpb25zKVxuXG52YXIgcXVlcnlGaWVsZCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgcmV0dXJuIGV2ZW50Tm9kZShcImlucHV0XCIsIHtcbiAgICBpZDogXCJxdWVyeS1ib3hcIixcbiAgICBjbGFzc05hbWU6IFwiaW5wdXQtYm94XCIsXG4gICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgdmFsdWU6IHRleHRcbiAgfSwgW10sIFtcbiAgICBvbklucHV0KGFjdGlvbnMsIEFjdGlvbnMuVXBkYXRlRmllbGQpXG4gIF0pXG59XG5cblxuXG52YXIgdmlldyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiBub2RlKFwiZGl2XCIsIHt9LCBbXG4gICAgcXVlcnlGaWVsZChzdGF0ZS5maWVsZCksXG4gICAgbm9kZShcImRpdlwiLCB7Y2xhc3NOYW1lOiBcIm1pcnJvclwifSwgW1xuICAgICAgdGV4dChzdGF0ZS5maWVsZClcbiAgICBdKVxuICBdKVxufVxuXG52YXIgbWFpbiA9IGxpZnQodmlldywgc3RhdGUpXG5leHBvcnRzLm1haW4gPSBtYWluXG5cbmFwcChtYWluKVxuIl19
;