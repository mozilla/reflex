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
  var attributes = this.properties.attributes || (this.properties.attributes = {})
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

function node(name, properties, contents) {
  return new Node(name, properties, contents)
}
exports.node = node

var EventNode = function (name, properties, contents, listeners) {
  var index = 0
  var count = listeners ? listeners.length : 0
  var attributes = properties.attributes || (properties.attributes = {})
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

var eventNode = function(name, properties, contents, listeners) {
  return new EventNode(name, properties, contents, listeners)
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
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvYXBwLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2V2ZW50LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2h0bWwuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL2Z1bmN0aW9uYWwvaWRlbnRpdHkuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2RpZmYuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2hhbmRsZS10aHVuay5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdGh1bmsuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZob29rLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92dHJlZS9pcy12bm9kZS5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdnRleHQuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXdpZGdldC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvbm9kZV9tb2R1bGVzL2lzLW9iamVjdC9pbmRleC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvbm9kZV9tb2R1bGVzL3gtaXMtYXJyYXkvaW5kZXguanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3ZlcnNpb24uanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3Zub2RlLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92dHJlZS92cGF0Y2guanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL3Z0ZXh0LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L3NpZ25hbC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvcmVmbGV4L2V4YW1wbGVzL3F1ZXJ5LWZpZWxkL2FwcC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDelZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBmb2xkcCA9IHJlcXVpcmUoXCIuL3NpZ25hbFwiKS5mb2xkcFxudmFyIHN0YXJ0ID0gcmVxdWlyZShcIi4vc2lnbmFsXCIpLnN0YXJ0XG52YXIgZGlmZiA9IHJlcXVpcmUoXCIuL2h0bWxcIikuZGlmZlxudmFyIHNlbGVjdCA9IHJlcXVpcmUoXCIuL2h0bWxcIikuc2VsZWN0XG5cbmZ1bmN0aW9uIGFwcChpbnB1dCkge1xuICAvLyBtYWludGFpbiBzdGF0ZSBvZiBhbmQgcG9zdCBtZXNzYWdlcyB3aXRoIHRyZWUgY2hhbmdlcy5cbiAgdmFyIHRyZWUgPSBmb2xkcChmdW5jdGlvbihwYXN0LCBwcmVzZW50KSB7XG4gICAgdmFyIGNoYW5nZXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRpZmYocGFzdCwgcHJlc2VudCkpKVxuICAgIHNlbGYucG9zdE1lc3NhZ2UoY2hhbmdlcylcbiAgICByZXR1cm4gcHJlc2VudFxuICB9LCBpbnB1dC52YWx1ZSwgaW5wdXQpXG5cbiAgLy8gcmVjZWl2ZSBldmVudHMgdmlhIG1lc3NhZ2VzIGFuZCBkaXNwYXRjaCB0byB2bm9kZVxuICAvLyBsaXN0ZW5lci5cbiAgc2VsZi5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgdmFyIGV2ZW50ID0gbWVzc2FnZS5kYXRhXG4gICAgaWYgKGV2ZW50KSB7XG4gICAgICB2YXIgbm9kZSA9IHNlbGVjdChldmVudC5wYXRoLCB0cmVlLnZhbHVlKVxuICAgICAgbm9kZS5oYW5kbGVFdmVudChldmVudClcbiAgICB9XG4gIH0pXG5cbiAgc3RhcnQodHJlZSlcbiAgc2VsZi5wb3N0TWVzc2FnZShpbnB1dC52YWx1ZS53aXRoUGF0aCgpLnRvSlNPTigpKVxufVxuZXhwb3J0cy5hcHAgPSBhcHBcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc2lnbmFsID0gcmVxdWlyZShcIi4vc2lnbmFsXCIpLFxuICAgIElucHV0ID0gc2lnbmFsLklucHV0LCBzdGFydCA9IHNpZ25hbC5zdGFydCxcbiAgICBzdG9wID0gc2lnbmFsLnN0b3AsIGVuZCA9IHNpZ25hbC5zdG9wLFxuICAgIGVuZCA9IHNpZ25hbC5lbmQsIHJlY2VpdmUgPSBzaWduYWwucmVjZWl2ZSxcbiAgICBvdXRwdXRzID0gc2lnbmFsLm91dHB1dHNcbnZhciBpZGVudGl0eSA9IHJlcXVpcmUoXCJmdW5jdGlvbmFsL2lkZW50aXR5XCIpXG5cblxudmFyIEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBwYXJzZSwgb3V0cHV0LCByZWFkKSB7XG4gIHRoaXMudHlwZSA9IHR5cGVcbiAgdGhpcy5vdXRwdXQgPSBvdXRwdXRcbiAgdGhpcy5wYXJzZSA9IHBhcnNlXG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShJbnB1dC5wcm90b3R5cGUpXG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV2ZW50TGlzdGVuZXJcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLm91dHB1dCA9IG51bGxcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLnR5cGUgPSBudWxsXG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5wYXJzZSA9IGlkZW50aXR5XG5FdmVudExpc3RlbmVyLnByb3RvdHlwZS5yZWFkID0gaWRlbnRpdHlcbkV2ZW50TGlzdGVuZXIucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmVjZWl2ZSh0aGlzLm91dHB1dCwgdGhpcy5yZWFkKHRoaXMucGFyc2UoZXZlbnQpKSlcbn1cbmV4cG9ydHMuRXZlbnRMaXN0ZW5lciA9IEV2ZW50TGlzdGVuZXJcblxuZnVuY3Rpb24gb24odHlwZSwgcGFyc2UsIG91dHB1dCwgcmVhZCkge1xuICByZXR1cm4gbmV3IEV2ZW50TGlzdGVuZXIodHlwZSwgcGFyc2UsIG91dHB1dCwgcmVhZClcbn1cbmV4cG9ydHMub24gPSBvblxuXG52YXIgTW91c2VMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIG91dHB1dCwgcmVhZCkge1xuICB0aGlzLnR5cGUgPSB0eXBlXG4gIHRoaXMub3V0cHV0ID0gb3V0cHV0XG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbk1vdXNlTGlzdGVuZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudExpc3RlbmVyLnByb3RvdHlwZSlcbk1vdXNlTGlzdGVuZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2VMaXN0ZW5lclxuZXhwb3J0cy5Nb3VzZUxpc3RlbmVyID0gTW91c2VMaXN0ZW5lclxuXG52YXIgb25Nb3VzZUV2ZW50ID0gZnVuY3Rpb24odHlwZSkge1xuICByZXR1cm4gZnVuY3Rpb24oaGFuZGxlLCByZWFkKSB7XG4gICAgcmV0dXJuIG5ldyBNb3VzZUxpc3RlbmVyKHR5cGUsIGhhbmRsZSwgcmVhZClcbiAgfVxufVxuXG5leHBvcnRzLm9uQ2xpY2sgPSBvbk1vdXNlRXZlbnQoXCJjbGlja1wiKVxuZXhwb3J0cy5vbkRvdWJsZUNsaWNrID0gb25Nb3VzZUV2ZW50KFwiZGJjbGlja1wiKVxuZXhwb3J0cy5vbk1vdXNlTW92ZSA9IG9uTW91c2VFdmVudChcIm1vdXNlbW92ZVwiKVxuZXhwb3J0cy5vbk1vdXNlRG93biA9IG9uTW91c2VFdmVudChcIm1vdXNlZG93blwiKVxuZXhwb3J0cy5vbk1vdXNlVXAgPSBvbk1vdXNlRXZlbnQoXCJtb3VzZXVwXCIpXG5leHBvcnRzLm9uTW91c2VFbnRlciA9IG9uTW91c2VFdmVudChcIm1vdXNlZW50ZXJcIilcbmV4cG9ydHMub25Nb3VzZUxlYXZlID0gb25Nb3VzZUV2ZW50KFwibW91c2VsZWF2ZVwiKVxuZXhwb3J0cy5vbk1vdXNlT3ZlciA9IG9uTW91c2VFdmVudChcIm1vdXNlb3ZlclwiKVxuZXhwb3J0cy5vbk1vdXNlT3V0ID0gb25Nb3VzZUV2ZW50KFwibW91c2VvdXRcIilcblxudmFyIEtleWJvYXJkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBvdXRwdXQsIHJlYWQpIHtcbiAgdGhpcy50eXBlID0gdHlwZVxuICB0aGlzLm91dHB1dCA9IG91dHB1dFxuICB0aGlzLnJlYWQgPSByZWFkXG59XG5LZXlib2FyZExpc3RlbmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRMaXN0ZW5lci5wcm90b3R5cGUpXG5LZXlib2FyZExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEtleWJvYXJkTGlzdGVuZXJcbmV4cG9ydHMuS2V5Ym9hcmRMaXN0ZW5lciA9IEtleWJvYXJkTGlzdGVuZXJcblxudmFyIG9uS2V5Ym9hcmRFdmVudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGhhbmRsZSwgcmVhZCkge1xuICAgIHJldHVybiBuZXcgS2V5Ym9hcmRMaXN0ZW5lcih0eXBlLCBoYW5kbGUsIHJlYWQpXG4gIH1cbn1cblxuZXhwb3J0cy5vbktleVVwID0gb25LZXlib2FyZEV2ZW50KFwia2V5dXBcIilcbmV4cG9ydHMub25LZXlEb3duID0gb25LZXlib2FyZEV2ZW50KFwia2V5ZG93blwiKVxuZXhwb3J0cy5vbktleVByZXNzID0gb25LZXlib2FyZEV2ZW50KFwia2V5cHJlc3NcIilcblxudmFyIFNpbXBsZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBvdXRwdXQsIHZhbHVlKSB7XG4gIHRoaXMudHlwZSA9IHR5cGVcbiAgdGhpcy5vdXRwdXQgPSBvdXRwdXRcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5TaW1wbGVFdmVudExpc3RlbmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRMaXN0ZW5lci5wcm90b3R5cGUpXG5TaW1wbGVFdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFNpbXBsZUV2ZW50TGlzdGVuZXJcblNpbXBsZUV2ZW50TGlzdGVuZXIucHJvdG90eXBlLmhhbmRsZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmVjZWl2ZSh0aGlzLm91dHB1dCwgdGhpcy52YWx1ZSlcbn1cbmV4cG9ydHMuU2ltcGxlRXZlbnRMaXN0ZW5lciA9IFNpbXBsZUV2ZW50TGlzdGVuZXJcblxudmFyIG9uU2ltcGxlRXZlbnQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHJldHVybiBmdW5jdGlvbihoYW5kbGUsIHZhbHVlKSB7XG4gICAgcmV0dXJuIG5ldyBTaW1wbGVFdmVudExpc3RlbmVyKHR5cGUsIGhhbmRsZSwgdmFsdWUpXG4gIH1cbn1cblxuZXhwb3J0cy5vbkJsdXIgPSBvblNpbXBsZUV2ZW50KFwiYmx1clwiKVxuZXhwb3J0cy5vbkZvY3VzID0gb25TaW1wbGVFdmVudChcImZvY3VzXCIpXG5leHBvcnRzLm9uU3VibWl0ID0gb25TaW1wbGVFdmVudChcInN1Ym1pdFwiKVxuXG52YXIgSW5wdXRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24ob3V0cHV0LCByZWFkKSB7XG4gIHRoaXMub3V0cHV0ID0gb3V0cHV0XG4gIHRoaXMucmVhZCA9IHJlYWRcbn1cbklucHV0RXZlbnRMaXN0ZW5lci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50TGlzdGVuZXIucHJvdG90eXBlKVxuSW5wdXRFdmVudExpc3RlbmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IElucHV0RXZlbnRMaXN0ZW5lclxuSW5wdXRFdmVudExpc3RlbmVyLnByb3RvdHlwZS50eXBlID0gXCJpbnB1dFwiXG5JbnB1dEV2ZW50TGlzdGVuZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIGV2ZW50LnZhbHVlXG59XG5cblxudmFyIG9uSW5wdXQgPSBmdW5jdGlvbihoYW5kbGUsIHJlYWQpIHtcbiAgcmV0dXJuIG5ldyBJbnB1dEV2ZW50TGlzdGVuZXIoaGFuZGxlLCByZWFkKVxufVxuZXhwb3J0cy5vbklucHV0ID0gb25JbnB1dFxuIiwiXCJ1c2Ugc3RpY3RcIjtcblxudmFyIFZOb2RlID0gcmVxdWlyZShcInZ0cmVlL3Zub2RlXCIpO1xudmFyIFZUZXh0ID0gcmVxdWlyZShcInZ0cmVlL3Z0ZXh0XCIpO1xudmFyIHZkaWZmID0gcmVxdWlyZShcInZ0cmVlL2RpZmZcIik7XG52YXIgVmlydHVhbFBhdGNoID0gcmVxdWlyZShcInZ0cmVlL3ZwYXRjaFwiKVxuXG4vLyBOZWVkIHRvIGFkZCB0b0pTT04gbWV0aG9kcyBzbyB0aGF0IHBhdGNoZXMgY291bGQgYmVcbi8vIHNlcmlhbGl6ZWQgZm9yIHNlbmRpbmcgYXMgbWVzc2FnZXMgYWNyb3NzIHdvcmtlcnMuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHZlcnNpb246IHRoaXMudmVyc2lvbixcbiAgICB0eXBlOiB0aGlzLnR5cGUsXG4gICAgcGF0Y2g6IHRoaXMucGF0Y2gsXG4gICAgdk5vZGU6IHRoaXMudk5vZGUudG9KU09OKCksXG4gIH1cbn1cblxudmFyIFRleHQgPSBWVGV4dFxuVGV4dC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgIHR5cGU6IHRoaXMudHlwZSxcbiAgICB0ZXh0OiB0aGlzLnRleHRcbiAgfVxufVxuZXhwb3J0cy5UZXh0ID0gVGV4dFxuXG5cbmZ1bmN0aW9uIHRleHQoY29udGVudCkge1xuICByZXR1cm4gbmV3IFRleHQoY29udGVudClcbn1cbmV4cG9ydHMudGV4dCA9IHRleHRcblxudmFyIE5vZGUgPSBWTm9kZVxuTm9kZS5wcm90b3R5cGUud2l0aFBhdGggPSBmdW5jdGlvbihiYXNlKSB7XG4gIGJhc2UgPSBiYXNlIHx8IFwiXCJcbiAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcyB8fCAodGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMgPSB7fSlcbiAgdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXNbXCJkYXRhLXJlZmxleC1wYXRoXCJdID0gYmFzZVxuXG4gIHZhciBpbmRleCA9IDBcbiAgdmFyIG5vZGVzID0gdGhpcy5jaGlsZHJlblxuICB3aGlsZSAoaW5kZXggPCBub2Rlcy5sZW5ndGgpIHtcbiAgICB2YXIgbm9kZSA9IG5vZGVzW2luZGV4XVxuICAgIGlmIChub2RlLndpdGhQYXRoKSB7XG4gICAgICB2YXIga2V5ID0gbm9kZS5wcm9wZXJ0aWVzLmtleSB8fCBpbmRleFxuICAgICAgbm9kZS53aXRoUGF0aChiYXNlICsgXCIuXCIgKyBrZXkpXG4gICAgfVxuICAgIGluZGV4ID0gaW5kZXggKyAxXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxudmFyIHRvSlNPTiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHgudG9KU09OKClcbn1cblxuTm9kZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB7XG4gICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgIHR5cGU6IHRoaXMudHlwZSxcbiAgICBjb3VudDogdGhpcy5jb3VudCxcbiAgICB0YWdOYW1lOiB0aGlzLnRhZ05hbWUsXG4gICAgcHJvcGVydGllczogdGhpcy5wcm9wZXJ0aWVzLFxuICAgIGNoaWxkcmVuOiB0aGlzLmNoaWxkcmVuLm1hcCh0b0pTT04pLFxuICAgIGtleTogdGhpcy5rZXksXG4gICAgbmFtZXNwYWNlOiB0aGlzLm5hbWVzcGFjZSxcbiAgICBoYXNXaWRnZXRzOiB0aGlzLmhhc1dpZGdldHMsXG4gICAgaG9va3M6IHRoaXMuaG9va3MsXG4gICAgZGVzY2VuZGFudEhvb2tzOiB0aGlzLmRlc2NlbmRhbnRIb29rc1xuICB9XG59XG5leHBvcnRzLk5vZGUgPSBOb2RlXG5cbmZ1bmN0aW9uIG5vZGUobmFtZSwgcHJvcGVydGllcywgY29udGVudHMpIHtcbiAgcmV0dXJuIG5ldyBOb2RlKG5hbWUsIHByb3BlcnRpZXMsIGNvbnRlbnRzKVxufVxuZXhwb3J0cy5ub2RlID0gbm9kZVxuXG52YXIgRXZlbnROb2RlID0gZnVuY3Rpb24gKG5hbWUsIHByb3BlcnRpZXMsIGNvbnRlbnRzLCBsaXN0ZW5lcnMpIHtcbiAgdmFyIGluZGV4ID0gMFxuICB2YXIgY291bnQgPSBsaXN0ZW5lcnMgPyBsaXN0ZW5lcnMubGVuZ3RoIDogMFxuICB2YXIgYXR0cmlidXRlcyA9IHByb3BlcnRpZXMuYXR0cmlidXRlcyB8fCAocHJvcGVydGllcy5hdHRyaWJ1dGVzID0ge30pXG4gIHdoaWxlIChpbmRleCA8IGNvdW50KSB7XG4gICAgdmFyIHR5cGUgPSBsaXN0ZW5lcnNbaW5kZXhdLnR5cGVcbiAgICBwcm9wZXJ0aWVzLmF0dHJpYnV0ZXNbXCJkYXRhLXJlZmxleC1ldmVudC1cIiArIHR5cGVdID0gdHJ1ZVxuICAgIGluZGV4ID0gaW5kZXggKyAxXG4gIH1cblxuICBOb2RlLmNhbGwodGhpcywgbmFtZSwgcHJvcGVydGllcywgY29udGVudHMpXG4gIHRoaXMubGlzdGVuZXJzID0gbGlzdGVuZXJzXG5cbn1cbkV2ZW50Tm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE5vZGUucHJvdG90eXBlKVxuRXZlbnROb2RlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEV2ZW50Tm9kZVxuRXZlbnROb2RlLnByb3RvdHlwZS5oYW5kbGVFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHRoaXMubGlzdGVuZXJzLmZvckVhY2goZnVuY3Rpb24obGlzdGVuZXIpIHtcbiAgICBpZiAobGlzdGVuZXIudHlwZSA9PT0gZXZlbnQudHlwZSkge1xuICAgICAgbGlzdGVuZXIuaGFuZGxlRXZlbnQoZXZlbnQpXG4gICAgfVxuICB9KVxufVxuXG52YXIgZXZlbnROb2RlID0gZnVuY3Rpb24obmFtZSwgcHJvcGVydGllcywgY29udGVudHMsIGxpc3RlbmVycykge1xuICByZXR1cm4gbmV3IEV2ZW50Tm9kZShuYW1lLCBwcm9wZXJ0aWVzLCBjb250ZW50cywgbGlzdGVuZXJzKVxufVxuZXhwb3J0cy5ldmVudE5vZGUgPSBldmVudE5vZGVcblxuXG52YXIgZGlmZiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgcmV0dXJuIHZkaWZmKGEsIGIud2l0aFBhdGgoKSlcbn1cbmV4cG9ydHMuZGlmZiA9IGRpZmZcblxudmFyIHNlbGVjdCA9IGZ1bmN0aW9uKHBhdGgsIHJvb3QpIHtcbiAgdmFyIGVudHJ5ID0gcm9vdFxuICB2YXIgbGV2ZWwgPSAxXG4gIHZhciBjb3VudCA9IHBhdGgubGVuZ3RoXG4gIHdoaWxlIChsZXZlbCA8IGNvdW50KSB7XG4gICAgdmFyIGtleSA9IHBhdGhbbGV2ZWxdXG4gICAgZW50cnkgPSBlbnRyeS5jaGlsZHJlbltrZXldXG4gICAgbGV2ZWwgPSBsZXZlbCArIDFcbiAgfVxuICByZXR1cm4gZW50cnlcbn1cbmV4cG9ydHMuc2VsZWN0ID0gc2VsZWN0XG4iLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBpZGVudGl0eVxuZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHsgcmV0dXJuIHZhbHVlIH1cbiIsInZhciBpc0FycmF5ID0gcmVxdWlyZShcIngtaXMtYXJyYXlcIilcbnZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcblxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCIuL3ZwYXRjaFwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi9oYW5kbGUtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG5cbmZ1bmN0aW9uIGRpZmYoYSwgYikge1xuICAgIHZhciBwYXRjaCA9IHsgYTogYSB9XG4gICAgd2FsayhhLCBiLCBwYXRjaCwgMClcbiAgICByZXR1cm4gcGF0Y2hcbn1cblxuZnVuY3Rpb24gd2FsayhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoYSA9PT0gYikge1xuICAgICAgICBpZiAoaXNUaHVuayhhKSB8fCBpc1RodW5rKGIpKSB7XG4gICAgICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaG9va3MoYiwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBhcHBseSA9IHBhdGNoW2luZGV4XVxuXG4gICAgaWYgKGIgPT0gbnVsbCkge1xuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGEsIGIpKVxuICAgICAgICBkZXN0cm95V2lkZ2V0cyhhLCBwYXRjaCwgaW5kZXgpXG4gICAgfSBlbHNlIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUoYikpIHtcbiAgICAgICAgaWYgKGlzVk5vZGUoYSkpIHtcbiAgICAgICAgICAgIGlmIChhLnRhZ05hbWUgPT09IGIudGFnTmFtZSAmJlxuICAgICAgICAgICAgICAgIGEubmFtZXNwYWNlID09PSBiLm5hbWVzcGFjZSAmJlxuICAgICAgICAgICAgICAgIGEua2V5ID09PSBiLmtleSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wc1BhdGNoID0gZGlmZlByb3BzKGEucHJvcGVydGllcywgYi5wcm9wZXJ0aWVzLCBiLmhvb2tzKVxuICAgICAgICAgICAgICAgIGlmIChwcm9wc1BhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgYSwgcHJvcHNQYXRjaCkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcHBseSA9IGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KGIpKSB7XG4gICAgICAgIGlmICghaXNWVGV4dChhKSkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9IGVsc2UgaWYgKGEudGV4dCAhPT0gYi50ZXh0KSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WVEVYVCwgYSwgYikpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLldJREdFVCwgYSwgYikpXG5cbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoYSwgcGF0Y2gsIGluZGV4KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGx5XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmUHJvcHMoYSwgYiwgaG9va3MpIHtcbiAgICB2YXIgZGlmZlxuXG4gICAgZm9yICh2YXIgYUtleSBpbiBhKSB7XG4gICAgICAgIGlmICghKGFLZXkgaW4gYikpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gdW5kZWZpbmVkXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYVZhbHVlID0gYVthS2V5XVxuICAgICAgICB2YXIgYlZhbHVlID0gYlthS2V5XVxuXG4gICAgICAgIGlmIChob29rcyAmJiBhS2V5IGluIGhvb2tzKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlzT2JqZWN0KGFWYWx1ZSkgJiYgaXNPYmplY3QoYlZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmIChnZXRQcm90b3R5cGUoYlZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKGFWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmplY3REaWZmID0gZGlmZlByb3BzKGFWYWx1ZSwgYlZhbHVlKVxuICAgICAgICAgICAgICAgICAgICBpZiAob2JqZWN0RGlmZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBvYmplY3REaWZmXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGFWYWx1ZSAhPT0gYlZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBiS2V5IGluIGIpIHtcbiAgICAgICAgaWYgKCEoYktleSBpbiBhKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYktleV0gPSBiW2JLZXldXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICAgIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpIHtcbiAgICB2YXIgYUNoaWxkcmVuID0gYS5jaGlsZHJlblxuICAgIHZhciBiQ2hpbGRyZW4gPSByZW9yZGVyKGFDaGlsZHJlbiwgYi5jaGlsZHJlbilcblxuICAgIHZhciBhTGVuID0gYUNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBiTGVuID0gYkNoaWxkcmVuLmxlbmd0aFxuICAgIHZhciBsZW4gPSBhTGVuID4gYkxlbiA/IGFMZW4gOiBiTGVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IGFDaGlsZHJlbltpXVxuICAgICAgICB2YXIgcmlnaHROb2RlID0gYkNoaWxkcmVuW2ldXG4gICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICBpZiAoIWxlZnROb2RlKSB7XG4gICAgICAgICAgICBpZiAocmlnaHROb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhjZXNzIG5vZGVzIGluIGIgbmVlZCB0byBiZSBhZGRlZFxuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLklOU0VSVCwgbnVsbCwgcmlnaHROb2RlKSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghcmlnaHROb2RlKSB7XG4gICAgICAgICAgICBpZiAobGVmdE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYSBuZWVkIHRvIGJlIHJlbW92ZWRcbiAgICAgICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGxlZnROb2RlLCBudWxsKVxuICAgICAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGxlZnROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3YWxrKGxlZnROb2RlLCByaWdodE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ZOb2RlKGxlZnROb2RlKSAmJiBsZWZ0Tm9kZS5jb3VudCkge1xuICAgICAgICAgICAgaW5kZXggKz0gbGVmdE5vZGUuY291bnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChiQ2hpbGRyZW4ubW92ZXMpIHtcbiAgICAgICAgLy8gUmVvcmRlciBub2RlcyBsYXN0XG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLk9SREVSLCBhLCBiQ2hpbGRyZW4ubW92ZXMpKVxuICAgIH1cblxuICAgIHJldHVybiBhcHBseVxufVxuXG4vLyBQYXRjaCByZWNvcmRzIGZvciBhbGwgZGVzdHJveWVkIHdpZGdldHMgbXVzdCBiZSBhZGRlZCBiZWNhdXNlIHdlIG5lZWRcbi8vIGEgRE9NIG5vZGUgcmVmZXJlbmNlIGZvciB0aGUgZGVzdHJveSBmdW5jdGlvblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1dpZGdldCh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2Tm9kZS5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlJFTU9WRSwgdk5vZGUsIG51bGwpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUodk5vZGUpICYmIHZOb2RlLmhhc1dpZGdldHMpIHtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICBkZXN0cm95V2lkZ2V0cyhjaGlsZCwgcGF0Y2gsIGluZGV4KVxuXG4gICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBDcmVhdGUgYSBzdWItcGF0Y2ggZm9yIHRodW5rc1xuZnVuY3Rpb24gdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIHZhciBub2RlcyA9IGhhbmRsZVRodW5rKGEsIGIpO1xuICAgIHZhciB0aHVua1BhdGNoID0gZGlmZihub2Rlcy5hLCBub2Rlcy5iKVxuICAgIGlmIChoYXNQYXRjaGVzKHRodW5rUGF0Y2gpKSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlRIVU5LLCBudWxsLCB0aHVua1BhdGNoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzUGF0Y2hlcyhwYXRjaCkge1xuICAgIGZvciAodmFyIGluZGV4IGluIHBhdGNoKSB7XG4gICAgICAgIGlmIChpbmRleCAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBFeGVjdXRlIGhvb2tzIHdoZW4gdHdvIG5vZGVzIGFyZSBpZGVudGljYWxcbmZ1bmN0aW9uIGhvb2tzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNWTm9kZSh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHZOb2RlLmhvb2tzKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgdk5vZGUuaG9va3MsIHZOb2RlLmhvb2tzKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZOb2RlLmRlc2NlbmRhbnRIb29rcykge1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gdk5vZGUuY2hpbGRyZW5cbiAgICAgICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIGhvb2tzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIExpc3QgZGlmZiwgbmFpdmUgbGVmdCB0byByaWdodCByZW9yZGVyaW5nXG5mdW5jdGlvbiByZW9yZGVyKGFDaGlsZHJlbiwgYkNoaWxkcmVuKSB7XG5cbiAgICB2YXIgYktleXMgPSBrZXlJbmRleChiQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWJLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYUtleXMgPSBrZXlJbmRleChhQ2hpbGRyZW4pXG5cbiAgICBpZiAoIWFLZXlzKSB7XG4gICAgICAgIHJldHVybiBiQ2hpbGRyZW5cbiAgICB9XG5cbiAgICB2YXIgYk1hdGNoID0ge30sIGFNYXRjaCA9IHt9XG5cbiAgICBmb3IgKHZhciBrZXkgaW4gYktleXMpIHtcbiAgICAgICAgYk1hdGNoW2JLZXlzW2tleV1dID0gYUtleXNba2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGtleSBpbiBhS2V5cykge1xuICAgICAgICBhTWF0Y2hbYUtleXNba2V5XV0gPSBiS2V5c1trZXldXG4gICAgfVxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cbiAgICB2YXIgc2h1ZmZsZSA9IFtdXG4gICAgdmFyIGZyZWVJbmRleCA9IDBcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgbW92ZUluZGV4ID0gMFxuICAgIHZhciBtb3ZlcyA9IHt9XG4gICAgdmFyIHJlbW92ZXMgPSBtb3Zlcy5yZW1vdmVzID0ge31cbiAgICB2YXIgcmV2ZXJzZSA9IG1vdmVzLnJldmVyc2UgPSB7fVxuICAgIHZhciBoYXNNb3ZlcyA9IGZhbHNlXG5cbiAgICB3aGlsZSAoZnJlZUluZGV4IDwgbGVuKSB7XG4gICAgICAgIHZhciBtb3ZlID0gYU1hdGNoW2ldXG4gICAgICAgIGlmIChtb3ZlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSBiQ2hpbGRyZW5bbW92ZV1cbiAgICAgICAgICAgIGlmIChtb3ZlICE9PSBtb3ZlSW5kZXgpIHtcbiAgICAgICAgICAgICAgICBtb3Zlc1ttb3ZlXSA9IG1vdmVJbmRleFxuICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IG1vdmVcbiAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgIH0gZWxzZSBpZiAoaSBpbiBhTWF0Y2gpIHtcbiAgICAgICAgICAgIHNodWZmbGVbaV0gPSB1bmRlZmluZWRcbiAgICAgICAgICAgIHJlbW92ZXNbaV0gPSBtb3ZlSW5kZXgrK1xuICAgICAgICAgICAgaGFzTW92ZXMgPSB0cnVlXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoYk1hdGNoW2ZyZWVJbmRleF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChmcmVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZnJlZUNoaWxkID0gYkNoaWxkcmVuW2ZyZWVJbmRleF1cbiAgICAgICAgICAgICAgICBpZiAoZnJlZUNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNodWZmbGVbaV0gPSBmcmVlQ2hpbGRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyZWVJbmRleCAhPT0gbW92ZUluZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNNb3ZlcyA9IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmVzW2ZyZWVJbmRleF0gPSBtb3ZlSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldmVyc2VbbW92ZUluZGV4XSA9IGZyZWVJbmRleFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1vdmVJbmRleCsrXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyZWVJbmRleCsrXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaSsrXG4gICAgfVxuXG4gICAgaWYgKGhhc01vdmVzKSB7XG4gICAgICAgIHNodWZmbGUubW92ZXMgPSBtb3Zlc1xuICAgIH1cblxuICAgIHJldHVybiBzaHVmZmxlXG59XG5cbmZ1bmN0aW9uIGtleUluZGV4KGNoaWxkcmVuKSB7XG4gICAgdmFyIGksIGtleXNcblxuICAgIGZvciAoaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuXG4gICAgICAgIGlmIChjaGlsZC5rZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAga2V5cyA9IGtleXMgfHwge31cbiAgICAgICAgICAgIGtleXNbY2hpbGQua2V5XSA9IGlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBrZXlzXG59XG5cbmZ1bmN0aW9uIGFwcGVuZFBhdGNoKGFwcGx5LCBwYXRjaCkge1xuICAgIGlmIChhcHBseSkge1xuICAgICAgICBpZiAoaXNBcnJheShhcHBseSkpIHtcbiAgICAgICAgICAgIGFwcGx5LnB1c2gocGF0Y2gpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IFthcHBseSwgcGF0Y2hdXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXBwbHlcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0Y2hcbiAgICB9XG59XG4iLCJ2YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGVUaHVua1xuXG5mdW5jdGlvbiBoYW5kbGVUaHVuayhhLCBiKSB7XG4gICAgdmFyIHJlbmRlcmVkQSA9IGFcbiAgICB2YXIgcmVuZGVyZWRCID0gYlxuXG4gICAgaWYgKGlzVGh1bmsoYikpIHtcbiAgICAgICAgcmVuZGVyZWRCID0gcmVuZGVyVGh1bmsoYiwgYSlcbiAgICB9XG5cbiAgICBpZiAoaXNUaHVuayhhKSkge1xuICAgICAgICByZW5kZXJlZEEgPSByZW5kZXJUaHVuayhhLCBudWxsKVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IHJlbmRlcmVkQSxcbiAgICAgICAgYjogcmVuZGVyZWRCXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJUaHVuayh0aHVuaywgcHJldmlvdXMpIHtcbiAgICB2YXIgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlXG5cbiAgICBpZiAoIXJlbmRlcmVkVGh1bmspIHtcbiAgICAgICAgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlID0gdGh1bmsucmVuZGVyKHByZXZpb3VzKVxuICAgIH1cblxuICAgIGlmICghKGlzVk5vZGUocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzVlRleHQocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzV2lkZ2V0KHJlbmRlcmVkVGh1bmspKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0aHVuayBkaWQgbm90IHJldHVybiBhIHZhbGlkIG5vZGVcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkVGh1bmtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNUaHVua1xyXG5cclxuZnVuY3Rpb24gaXNUaHVuayh0KSB7XHJcbiAgICByZXR1cm4gdCAmJiB0LnR5cGUgPT09IFwiVGh1bmtcIlxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNIb29rXG5cbmZ1bmN0aW9uIGlzSG9vayhob29rKSB7XG4gICAgcmV0dXJuIGhvb2sgJiYgdHlwZW9mIGhvb2suaG9vayA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICFob29rLmhhc093blByb3BlcnR5KFwiaG9va1wiKVxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsTm9kZVxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxOb2RlKHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbE5vZGVcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbFRleHRcblxuZnVuY3Rpb24gaXNWaXJ0dWFsVGV4dCh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxUZXh0XCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzV2lkZ2V0XG5cbmZ1bmN0aW9uIGlzV2lkZ2V0KHcpIHtcbiAgICByZXR1cm4gdyAmJiB3LnR5cGUgPT09IFwiV2lkZ2V0XCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNPYmplY3RcblxuZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gXCJvYmplY3RcIiAmJiB4ICE9PSBudWxsXG59XG4iLCJ2YXIgbmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVJc0FycmF5IHx8IGlzQXJyYXlcblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIxXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNWSG9vayA9IHJlcXVpcmUoXCIuL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbE5vZGVcblxudmFyIG5vUHJvcGVydGllcyA9IHt9XG52YXIgbm9DaGlsZHJlbiA9IFtdXG5cbmZ1bmN0aW9uIFZpcnR1YWxOb2RlKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuLCBrZXksIG5hbWVzcGFjZSkge1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWVcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzIHx8IG5vUHJvcGVydGllc1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbiB8fCBub0NoaWxkcmVuXG4gICAgdGhpcy5rZXkgPSBrZXkgIT0gbnVsbCA/IFN0cmluZyhrZXkpIDogdW5kZWZpbmVkXG4gICAgdGhpcy5uYW1lc3BhY2UgPSAodHlwZW9mIG5hbWVzcGFjZSA9PT0gXCJzdHJpbmdcIikgPyBuYW1lc3BhY2UgOiBudWxsXG5cbiAgICB2YXIgY291bnQgPSAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB8fCAwXG4gICAgdmFyIGRlc2NlbmRhbnRzID0gMFxuICAgIHZhciBoYXNXaWRnZXRzID0gZmFsc2VcbiAgICB2YXIgZGVzY2VuZGFudEhvb2tzID0gZmFsc2VcbiAgICB2YXIgaG9va3NcblxuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3Byb3BOYW1lXVxuICAgICAgICAgICAgaWYgKGlzVkhvb2socHJvcGVydHkpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFob29rcykge1xuICAgICAgICAgICAgICAgICAgICBob29rcyA9IHt9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaG9va3NbcHJvcE5hbWVdID0gcHJvcGVydHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkpIHtcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzICs9IGNoaWxkLmNvdW50IHx8IDBcblxuICAgICAgICAgICAgaWYgKCFoYXNXaWRnZXRzICYmIGNoaWxkLmhhc1dpZGdldHMpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlc2NlbmRhbnRIb29rcyAmJiAoY2hpbGQuaG9va3MgfHwgY2hpbGQuZGVzY2VuZGFudEhvb2tzKSkge1xuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRIb29rcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzV2lkZ2V0cyAmJiBpc1dpZGdldChjaGlsZCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuY291bnQgPSBjb3VudCArIGRlc2NlbmRhbnRzXG4gICAgdGhpcy5oYXNXaWRnZXRzID0gaGFzV2lkZ2V0c1xuICAgIHRoaXMuaG9va3MgPSBob29rc1xuICAgIHRoaXMuZGVzY2VuZGFudEhvb2tzID0gZGVzY2VuZGFudEhvb2tzXG59XG5cblZpcnR1YWxOb2RlLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxOb2RlXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5WaXJ0dWFsUGF0Y2guTk9ORSA9IDBcblZpcnR1YWxQYXRjaC5WVEVYVCA9IDFcblZpcnR1YWxQYXRjaC5WTk9ERSA9IDJcblZpcnR1YWxQYXRjaC5XSURHRVQgPSAzXG5WaXJ0dWFsUGF0Y2guUFJPUFMgPSA0XG5WaXJ0dWFsUGF0Y2guT1JERVIgPSA1XG5WaXJ0dWFsUGF0Y2guSU5TRVJUID0gNlxuVmlydHVhbFBhdGNoLlJFTU9WRSA9IDdcblZpcnR1YWxQYXRjaC5USFVOSyA9IDhcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsUGF0Y2hcblxuZnVuY3Rpb24gVmlydHVhbFBhdGNoKHR5cGUsIHZOb2RlLCBwYXRjaCkge1xuICAgIHRoaXMudHlwZSA9IE51bWJlcih0eXBlKVxuICAgIHRoaXMudk5vZGUgPSB2Tm9kZVxuICAgIHRoaXMucGF0Y2ggPSBwYXRjaFxufVxuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxQYXRjaFwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBWaXJ0dWFsVGV4dCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0ID0gU3RyaW5nKHRleHQpXG59XG5cblZpcnR1YWxUZXh0LnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFRleHQucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxUZXh0XCJcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbi8vIFRoZSBsaWJyYXJ5IGZvciBnZW5lcmFsIHNpZ25hbCBtYW5pcHVsYXRpb24uIEluY2x1ZGVzIGBsaWZ0YCBmdW5jdGlvblxuLy8gKHRoYXQgc3VwcG9ydHMgdXAgdG8gOCBpbnB1dHMpLCBjb21iaW5hdGlvbnMsIGZpbHRlcnMsIGFuZCBwYXN0LWRlcGVuZGVuY2UuXG4vL1xuLy8gU2lnbmFscyBhcmUgdGltZS12YXJ5aW5nIHZhbHVlcy4gTGlmdGVkIGZ1bmN0aW9ucyBhcmUgcmVldmFsdWF0ZWQgd2hlbnZlclxuLy8gYW55IG9mIHRoZWlyIGlucHV0IHNpZ25hbHMgaGFzIGFuIGV2ZW50LiBTaWduYWwgZXZlbnRzIG1heSBiZSBvZiB0aGUgc2FtZVxuLy8gdmFsdWUgYXMgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBzaWduYWwuIFN1Y2ggc2lnbmFscyBhcmUgdXNlZnVsIGZvclxuLy8gdGltaW5nIGFuZCBwYXN0LWRlcGVuZGVuY2UuXG4vL1xuLy8gU29tZSB1c2VmdWwgZnVuY3Rpb25zIGZvciB3b3JraW5nIHdpdGggdGltZSAoZS5nLiBzZXR0aW5nIEZQUykgYW5kIGNvbWJpbmluZ1xuLy8gc2lnbmFscyBhbmQgdGltZSAoZS5nLiBkZWxheWluZyB1cGRhdGVzLCBnZXR0aW5nIHRpbWVzdGFtcHMpIGNhbiBiZSBmb3VuZCBpblxuLy8gdGhlIFRpbWUgbGlicmFyeS5cbi8vXG4vLyBNb2R1bGUgaW1wbGVtZW50cyBlbG0gQVBJOiBodHRwOi8vZG9jcy5lbG0tbGFuZy5vcmcvbGlicmFyeS9TaWduYWwuZWxtXG5cblxudmFyICRzb3VyY2UgPSBcInNvdXJjZUBzaWduYWxcIlxudmFyICRzb3VyY2VzID0gXCJzb3VyY2VzQHNpZ25hbFwiXG52YXIgJG91dHB1dHMgPSBcIm91dHB1dHNAc2lnbmFsXCJcbnZhciAkY29ubmVjdCA9IFwiY29ubmVjdEBzaWduYWxcIlxudmFyICRkaXNjb25uZWN0ID0gXCJkaXNjb25uZWN0QHNpZ25hbFwiXG52YXIgJHJlY2VpdmUgPSBcInJlY2VpdmVAc2lnbmFsXCJcbnZhciAkZXJyb3IgPSBcImVycm9yQHNpZ25hbFwiXG52YXIgJGVuZCA9IFwiZW5kQHNpZ25hbFwiXG52YXIgJHN0YXJ0ID0gXCJzdGFydEBzaWduYWxcIlxudmFyICRzdG9wID0gXCJzdG9wQHNpZ25hbFwiXG52YXIgJHN0YXRlID0gXCJzdGF0ZUBzaWduYWxcIlxudmFyICRwZW5kaW5nID0gXCJwZW5kaW5nQHNpZ25hbFwiXG5cbmZ1bmN0aW9uIG91dHB1dHMoaW5wdXQpIHsgcmV0dXJuIGlucHV0WyRvdXRwdXRzXSB9XG5vdXRwdXRzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkb3V0cHV0cyB9XG5leHBvcnRzLm91dHB1dHMgPSBvdXRwdXRzXG5cbmZ1bmN0aW9uIHN0YXJ0KGlucHV0KSB7IGlucHV0WyRzdGFydF0oaW5wdXQpIH1cbnN0YXJ0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkc3RhcnQgfVxuZXhwb3J0cy5zdGFydCA9IHN0YXJ0XG5cbmZ1bmN0aW9uIHN0b3AoaW5wdXQpIHsgaW5wdXRbJHN0b3BdKGlucHV0KSB9XG5zdG9wLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkc3RvcCB9XG5leHBvcnRzLnN0b3AgPSBzdG9wXG5cbmZ1bmN0aW9uIGNvbm5lY3Qoc291cmNlLCB0YXJnZXQpIHsgc291cmNlWyRjb25uZWN0XShzb3VyY2UsIHRhcmdldCkgfVxuY29ubmVjdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJGNvbm5lY3QgfVxuZXhwb3J0cy5jb25uZWN0ID0gY29ubmVjdFxuXG5mdW5jdGlvbiBkaXNjb25uZWN0KHNvdXJjZSwgdGFyZ2V0KSB7IHNvdXJjZVskZGlzY29ubmVjdF0oc291cmNlLCB0YXJnZXQpIH1cbmRpc2Nvbm5lY3QudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRkaXNjb25uZWN0IH1cbmV4cG9ydHMuZGlzY29ubmVjdCA9IGRpc2Nvbm5lY3RcblxuZnVuY3Rpb24gcmVjZWl2ZShpbnB1dCwgbWVzc2FnZSkgeyBpbnB1dFskcmVjZWl2ZV0oaW5wdXQsIG1lc3NhZ2UpIH1cbnJlY2VpdmUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRyZWNlaXZlIH1cbmV4cG9ydHMucmVjZWl2ZSA9IHJlY2VpdmVcblxuZnVuY3Rpb24gZXJyb3IoaW5wdXQsIG1lc3NhZ2UpIHsgaW5wdXRbJGVycm9yXShpbnB1dCwgbWVzc2FnZSkgfVxuZXJyb3IudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRlcnJvciB9XG5leHBvcnRzLmVycm9yID0gZXJyb3JcblxuZnVuY3Rpb24gZW5kKGlucHV0KSB7IGlucHV0WyRlbmRdKGlucHV0KSB9XG5lbmQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRlbmQgfVxuZXhwb3J0cy5lbmQgPSBlbmRcblxuZnVuY3Rpb24gc3RyaW5naWZ5KGlucHV0KSB7XG4gIHJldHVybiBpbnB1dC5uYW1lICsgXCJbXCIgKyAoaW5wdXRbJG91dHB1dHNdIHx8IFtdKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lIH0pICsgXCJdXCJcbn1cblxudmFyIHN0cmluZ2lmaWVyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuZnVuY3Rpb24gaXNFcnJvcihtZXNzYWdlKSB7XG4gIHJldHVybiBzdHJpbmdpZmllci5jYWxsKG1lc3NhZ2UpID09PSBcIltvYmplY3QgRXJyb3JdXCJcbn1cblxuZnVuY3Rpb24gUmV0dXJuKHZhbHVlKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZXR1cm4pKVxuICAgIHJldHVybiBuZXcgUmV0dXJuKHZhbHVlKVxuXG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxufVxuZXhwb3J0cy5SZXR1cm4gPSBSZXR1cm5cblxuZnVuY3Rpb24gc2VuZChpbnB1dCwgbWVzc2FnZSkge1xuICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFJldHVybikge1xuICAgIGlucHV0WyRyZWNlaXZlXShpbnB1dCwgbWVzc2FnZS52YWx1ZSlcbiAgICBpbnB1dFskZW5kXShpbnB1dClcbiAgfVxuICBlbHNlIGlmIChpc0Vycm9yKG1lc3NhZ2UpKSB7XG4gICAgaW5wdXRbJGVycm9yXShpbnB1dCwgbWVzc2FnZSlcbiAgfVxuICBlbHNlIHtcbiAgICBpbnB1dFskcmVjZWl2ZV0oaW5wdXQsIG1lc3NhZ2UpXG4gIH1cbn1cbmV4cG9ydHMuc2VuZCA9IHNlbmRcblxuZnVuY3Rpb24gQnJlYWsoKSB7fVxuZXhwb3J0cy5CcmVhayA9IEJyZWFrXG5cblxuZnVuY3Rpb24gSW5wdXQoc291cmNlKSB7XG4gIHRoaXNbJHNvdXJjZV0gPSBzb3VyY2U7XG4gIHRoaXNbJG91dHB1dHNdID0gW107XG59XG5leHBvcnRzLklucHV0ID0gSW5wdXRcblxuXG4vLyBgSW5wdXQuc3RhcnRgIGlzIGludm9rZWQgd2l0aCBhbiBgaW5wdXRgIHdoZW5ldmVyIHN5c3RlbSBpc1xuLy8gcmVhZHkgdG8gc3RhcnQgcmVjZWl2aW5nIHZhbHVlcy4gQWZ0ZXIgdGhpcyBwb2ludCBgaW5wdXRgIGNhblxuLy8gc3RhcnQgc2VuZGluZyBtZXNzYWdlcy4gR2VuZXJpYyBiZWhhdmlvciBpcyB0byBgY29ubmVjdGAgdG9cbi8vIHRoZSBgaW5wdXRbJHNvdXJjZV1gIHRvIHN0YXJ0IHJlY2VpdmluZyBtZXNzYWdlcy5cbklucHV0LnN0YXJ0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZSA9IGlucHV0WyRzb3VyY2VdXG4gIGlmIChzb3VyY2UpIHtcbiAgICBzb3VyY2VbJGNvbm5lY3RdKHNvdXJjZSwgaW5wdXQpXG4gIH1cbn1cblxuLy8gYElucHV0LnN0b3BgIGlzIGludm9rZWQgd2l0aCBhbiBgaW5wdXRgIHdoZW5ldmVyIGl0IG5lZWRzIHRvXG4vLyBzdG9wLiBBZnRlciB0aGlzIHBvaW50IGBpbnB1dGAgc2hvdWxkIHN0b3Agc2VuZGluZyBtZXNzYWdlcy5cbi8vIEdlbmVyaWMgYElucHV0YCBiZWhhdmlvciBpcyB0byBgZGlzY29ubmVjdGAgZnJvbSB0aGVcbi8vIGBpbnB1dFskc291cmNlXWAgc28gbm8gbW9yZSBgbWVzc2FnZXNgIHdpbGwgYmUgcmVjZWl2ZWQuXG5JbnB1dC5zdG9wID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZSA9IGlucHV0WyRzb3VyY2VdXG4gIHNvdXJjZVskZGlzY29ubmVjdF0oc291cmNlLCBpbnB1dClcbn1cblxuLy8gYElucHV0LmNvbm5lY3RgIGlzIGludm9rZWQgd2l0aCBgaW5wdXRgIGFuZCBgb3V0cHV0YC4gVGhpc1xuLy8gaW1wbGVtZW50YXRpb24gcHV0J3MgYG91dHB1dGAgdG8gaXQncyBgJG91dHB1dGAgcG9ydHMgdG9cbi8vIGRlbGVnYXRlIHJlY2VpdmVkIGBtZXNzYWdlc2AgdG8gaXQuXG5JbnB1dC5jb25uZWN0ID0gZnVuY3Rpb24oaW5wdXQsIG91dHB1dCkge1xuICB2YXIgb3V0cHV0cyA9IGlucHV0WyRvdXRwdXRzXVxuICBpZiAob3V0cHV0cy5pbmRleE9mKG91dHB1dCkgPCAwKSB7XG4gICAgb3V0cHV0cy5wdXNoKG91dHB1dClcbiAgICBpZiAob3V0cHV0cy5sZW5ndGggPT09IDEpXG4gICAgICBpbnB1dFskc3RhcnRdKGlucHV0KVxuICB9XG59XG5cbi8vIGBJbnB1dC5kaXNjb25uZWN0YCBpcyBpbnZva2VkIHdpdGggYGlucHV0YCBhbmQgYW4gYG91dHB1dGBcbi8vIGNvbm5lY3RlZCB0byBpdC4gQWZ0ZXIgdGhpcyBwb2ludCBgb3V0cHV0YCBzaG91bGQgbm90IGxvbmdlclxuLy8gcmVjZWl2ZSBtZXNzYWdlcyBmcm9tIHRoZSBgaW5wdXRgLiBJZiBpdCdzIGEgbGFzdCBgb3V0cHV0YFxuLy8gYGlucHV0YCB3aWxsIGJlIHN0b3BwZWQuXG5JbnB1dC5kaXNjb25uZWN0ID0gZnVuY3Rpb24oaW5wdXQsIG91dHB1dCkge1xuICB2YXIgb3V0cHV0cyA9IGlucHV0WyRvdXRwdXRzXVxuICB2YXIgaW5kZXggPSBvdXRwdXRzLmluZGV4T2Yob3V0cHV0KVxuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIG91dHB1dHMuc3BsaWNlKGluZGV4LCAxKVxuICAgIGlmIChvdXRwdXRzLmxlbmd0aCA9PT0gMClcbiAgICAgIGlucHV0WyRzdG9wXShpbnB1dClcbiAgfVxufVxuXG4vLyBgSW5wdXQuUG9ydGAgY3JlYXRlcyBhIG1lc3NhZ2UgcmVjZWl2ZXIgcG9ydC4gYElucHV0YCBpbnN0YW5jZXMgc3VwcG9ydFxuLy8gYG1lc3NhZ2VgLCBgZXJyb3JgLCBgZW5kYCBwb3J0cy5cbklucHV0LlBvcnQgPSBmdW5jdGlvbihwb3J0KSB7XG4gIHZhciBpc0Vycm9yID0gcG9ydCA9PT0gJGVycm9yXG4gIHZhciBpc0VuZCA9IHBvcnQgPT09ICRlbmRcbiAgdmFyIGlzTWVzc2FnZSA9IHBvcnQgPT09ICRyZWNlaXZlXG5cbiAgLy8gRnVuY3Rpb24gd2lsbCB3cml0ZSBgbWVzc2FnZWAgdG8gYSBnaXZlbiBgaW5wdXRgLiBUaGlzIG1lYW5zXG4gIC8vIGl0IHdpbGwgZGVsZWdlYXRlIG1lc3NhZ2VzIHRvIGl0J3MgYGlucHV0WyRvdXRwdXRzXWAgcG9ydHMuXG4gIHJldHVybiBmdW5jdGlvbiB3cml0ZShpbnB1dCwgbWVzc2FnZSkge1xuICAgIHZhciBvdXRwdXRzID0gaW5wdXRbJG91dHB1dHNdXG4gICAgdmFyIHJlc3VsdCA9IHZvaWQoMClcbiAgICB2YXIgY291bnQgPSBvdXRwdXRzLmxlbmd0aFxuICAgIHZhciBpbmRleCA9IDBcblxuICAgIC8vIE5vdGU6IGRpc3BhdGNoIGxvb3AgZGVjcmVhc2VzIGNvdW50IG9yIGluY3JlYXNlcyBpbmRleCBhcyBuZWVkZWQuXG4gICAgLy8gVGhpcyBtYWtlcyBzdXJlIHRoYXQgbmV3IGNvbm5lY3Rpb25zIHdpbGwgbm90IHJlY2VpdmUgbWVzc2FnZXNcbiAgICAvLyB1bnRpbCBuZXh0IGRpc3BhdGNoIGxvb3AgJiBpbnRlbnRpb25hbGx5IHNvLlxuICAgIHdoaWxlIChpbmRleCA8IG91dHB1dHMubGVuZ3RoKSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIHNlbmQgYSB2YWx1ZSB0byBhIGNvbm5lY3RlZCBgb3V0cHV0YC4gSWYgdGhpcyBpc1xuICAgICAgLy8gYCRlbmRgIGBwb3J0YCByZXR1cm4gYEJyZWFrYCB0byBjYXVzZSBgb3V0cHV0YCB0byBiZVxuICAgICAgLy8gZGlzY29ubmVjdGVkLiBJZiBhbnkgb3RoZXIgYHBvcnRgIGp1c3QgZGVsaXZlciBhIGBtZXNzYWdlYC5cbiAgICAgIHZhciBvdXRwdXQgPSBvdXRwdXRzW2luZGV4XVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gaXNFbmQgPyBvdXRwdXRbcG9ydF0ob3V0cHV0LCBpbnB1dCkgOlxuICAgICAgICAgICAgICAgICBvdXRwdXRbcG9ydF0ob3V0cHV0LCBtZXNzYWdlLCBpbnB1dClcbiAgICAgIH1cbiAgICAgIGNhdGNoIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgcmVhc29uXG4gICAgICAgIC8vIElmIGV4Y2VwdGlvbiB3YXMgdGhyb3duIGFuZCBgbWVzc2FnZWAgd2FzIHNlbmQgdG8gYCRlcnJvcmBcbiAgICAgICAgLy8gYHBvcnRgIGdpdmUgdXAgYW5kIGxvZyBlcnJvci5cbiAgICAgICAgaWYgKGlzRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlY2VpdmUgYW4gZXJyb3IgbWVzc2FnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbilcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBleGNlcHRpb24gd2FzIHRocm93biB3aGVuIHdyaXRpbmcgdG8gYSBkaWZmZXJlbnQgYHBvcnRgXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gd3JpdGUgdG8gYW4gYCRlcnJvcmAgYHBvcnRgIG9mIHRoZSBgb3V0cHV0YC5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG91dHB1dFskZXJyb3JdKG91dHB1dCwgcmVhc29uLCBpbnB1dClcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgZXhjZXB0aW9uIGlzIHN0aWxsIHRocm93biB3aGVuIHdyaXRpbmcgdG8gYW4gYCRlcnJvcmBcbiAgICAgICAgICAvLyBgcG9ydGAgZ2l2ZSB1cCBhbmQgbG9nIGBlcnJvcmAuXG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlY2VpdmUgbWVzc2FnZSAmIGFuIGVycm9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiByZXN1bHQgb2Ygc2VuZGluZyBgbWVzc2FnZWAgdG8gYW4gYG91dHB1dGAgd2FzIGluc3RhbmNlXG4gICAgICAvLyBvZiBgQnJlYWtgLCBkaXNjb25uZWN0IHRoYXQgYG91dHB1dGAgc28gaXQgbm8gbG9uZ2VyIGdldCdzXG4gICAgICAvLyBtZXNzYWdlcy4gTm90ZSBgaW5kZXhgIGlzIGRlY3JlbWVudGVkIGFzIGRpc2Nvbm5lY3Qgd2lsbFxuICAgICAgLy8gcmVtb3ZlIGl0IGZyb20gYG91dHB1dHNgLlxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEJyZWFrIHx8IGlzRW5kKSB7XG4gICAgICAgIGlucHV0WyRkaXNjb25uZWN0XShpbnB1dCwgb3V0cHV0KVxuICAgICAgfVxuICAgICAgLy8gT24gYW55IG90aGVyIGByZXN1bHRgIGp1c3QgbW92ZSB0byBhIG5leHQgb3V0cHV0LlxuICAgICAgZWxzZSB7XG4gICAgICAgIGluZGV4ID0gaW5kZXggKyAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT25jZSBtZXNzYWdlIHdhcyB3cml0dGVuIHRvIGFsbCBvdXRwdXRzIHVwZGF0ZSBgdmFsdWVgIG9mXG4gICAgLy8gdGhlIGlucHV0LlxuICAgIGlmIChpc01lc3NhZ2UpXG4gICAgICBpbnB1dC52YWx1ZSA9IG1lc3NhZ2VcblxuICAgIGlmIChjb3VudCA9PT0gMCAmJiBpc0VuZClcbiAgICAgIGlucHV0WyRzdG9wXShpbnB1dClcbiAgfVxufVxuXG4vLyBJbnB1dHMgaGF2ZSBgbWVzc2FnZWAsIGBlcnJvcmAgYW5kIGBlbmRgIHBvcnRzXG5JbnB1dC5yZWNlaXZlID0gSW5wdXQuUG9ydCgkcmVjZWl2ZSlcbklucHV0LmVycm9yID0gSW5wdXQuUG9ydCgkZXJyb3IpXG5JbnB1dC5lbmQgPSBJbnB1dC5Qb3J0KCRlbmQpXG5cbi8vIFNhbWUgQVBJIGZ1bmN0aW9ucyBhcmUgc2F2ZWQgaW4gdGhlIHByb3RvdHlwZSBpbiBvcmRlciB0byBlbmFibGVcbi8vIHBvbHltb3JwaGljIGRpc3BhdGNoLlxuSW5wdXQucHJvdG90eXBlWyRzdGFydF0gPSBJbnB1dC5zdGFydFxuSW5wdXQucHJvdG90eXBlWyRzdG9wXSA9IElucHV0LnN0b3BcbklucHV0LnByb3RvdHlwZVskY29ubmVjdF0gPSBJbnB1dC5jb25uZWN0XG5JbnB1dC5wcm90b3R5cGVbJGRpc2Nvbm5lY3RdID0gSW5wdXQuZGlzY29ubmVjdFxuSW5wdXQucHJvdG90eXBlWyRyZWNlaXZlXSA9IElucHV0LnJlY2VpdmVcbklucHV0LnByb3RvdHlwZVskZXJyb3JdID0gSW5wdXQuZXJyb3JcbklucHV0LnByb3RvdHlwZVskZW5kXSA9IElucHV0LmVuZFxuSW5wdXQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4geyB2YWx1ZTogdGhpcy52YWx1ZSB9XG59XG5cbmZ1bmN0aW9uIENvbnN0YW50KHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxufVxuQ29uc3RhbnQuaWdub3JlID0gZnVuY3Rpb24oKSB7fVxuXG5Db25zdGFudC5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuQ29uc3RhbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29uc3RhbnRcbkNvbnN0YW50LnByb3RvdHlwZVskc3RhcnRdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJHN0b3BdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGNvbm5lY3RdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGRpc2Nvbm5lY3RdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJHJlY2VpdmVdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGVycm9yXSA9IENvbnN0YW50Lmlnbm9yZVxuQ29uc3RhbnQucHJvdG90eXBlWyRlbmRdID0gQ29uc3RhbnQuaWdub3JlXG5cblxuLy8gQ3JlYXRlIGEgY29uc3RhbnQgc2lnbmFsIHRoYXQgbmV2ZXIgY2hhbmdlcy5cblxuLy8gYSAtPiBTaWduYWwgYVxuXG5mdW5jdGlvbiBjb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gbmV3IENvbnN0YW50KHZhbHVlKVxufVxuZXhwb3J0cy5jb25zdGFudCA9IGNvbnN0YW50XG5cblxuZnVuY3Rpb24gTWVyZ2UoaW5wdXRzKSB7XG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlc10gPSBpbnB1dHNcbiAgdGhpc1skcGVuZGluZ10gPSBpbnB1dHMubGVuZ3RoXG4gIHRoaXMudmFsdWUgPSBpbnB1dHNbMF0udmFsdWVcbn1cbk1lcmdlLnN0YXJ0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZXMgPSBpbnB1dFskc291cmNlc11cbiAgdmFyIGNvdW50ID0gc291cmNlcy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuXG4gIHdoaWxlIChpZCA8IGNvdW50KSB7XG4gICAgdmFyIHNvdXJjZSA9IHNvdXJjZXNbaWRdXG4gICAgc291cmNlWyRjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbn1cbk1lcmdlLnN0b3AgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaW5wdXRzID0gaW5wdXRbJHNvdXJjZXNdXG4gIHZhciBjb3VudCA9IGlucHV0cy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuICB3aGlsZSAoaWQgPCBjb3VudCkge1xuICAgIHZhciBzb3VyY2UgPSBpbnB1dHNbaWRdXG4gICAgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbn1cbk1lcmdlLmVuZCA9IGZ1bmN0aW9uKGlucHV0LCBzb3VyY2UpIHtcbiAgdmFyIHNvdXJjZXMgPSBpbnB1dFskc291cmNlc11cbiAgdmFyIGlkID0gc291cmNlcy5pbmRleE9mKHNvdXJjZSlcbiAgaWYgKGlkID49IDApIHtcbiAgICB2YXIgcGVuZGluZyA9IGlucHV0WyRwZW5kaW5nXSAtIDFcbiAgICBpbnB1dFskcGVuZGluZ10gPSBwZW5kaW5nXG4gICAgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuXG4gICAgaWYgKHBlbmRpbmcgPT09IDApXG4gICAgICBJbnB1dC5lbmQoaW5wdXQpXG4gIH1cbn1cblxuTWVyZ2UucHJvdG90eXBlID0gbmV3IElucHV0KClcbk1lcmdlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1lcmdlXG5NZXJnZS5wcm90b3R5cGVbJHN0YXJ0XSA9IE1lcmdlLnN0YXJ0XG5NZXJnZS5wcm90b3R5cGVbJHN0b3BdID0gTWVyZ2Uuc3RvcFxuTWVyZ2UucHJvdG90eXBlWyRlbmRdID0gTWVyZ2UuZW5kXG5cbi8vIE1lcmdlIHR3byBzaWduYWxzIGludG8gb25lLCBiaWFzZWQgdG93YXJkcyB0aGVcbi8vIGZpcnN0IHNpZ25hbCBpZiBib3RoIHNpZ25hbHMgdXBkYXRlIGF0IHRoZSBzYW1lIHRpbWUuXG5cbi8vIFNpZ25hbCB4IC0+IFNpZ25hbCB5IC0+IC4uLiAtPiBTaWduYWwgelxuZnVuY3Rpb24gbWVyZ2UoKSB7XG4gIHJldHVybiBuZXcgTWVyZ2Uoc2xpY2VyLmNhbGwoYXJndW1lbnRzLCAwKSlcbn1cbmV4cG9ydHMubWVyZ2UgPSBtZXJnZVxuXG5cbi8vIE1lcmdlIG1hbnkgc2lnbmFscyBpbnRvIG9uZSwgYmlhc2VkIHRvd2FyZHMgdGhlXG4vLyBsZWZ0LW1vc3Qgc2lnbmFsIGlmIG11bHRpcGxlIHNpZ25hbHMgdXBkYXRlIHNpbXVsdGFuZW91c2x5LlxuZnVuY3Rpb24gbWVyZ2VzKGlucHV0cykge1xuICByZXR1cm4gbmV3IE1lcmdlKGlucHV0cylcbn1cbmV4cG9ydHMubWVyZ2VzID0gbWVyZ2VzXG5cblxuLy8gIyBQYXN0LURlcGVuZGVuY2VcblxuLy8gQ3JlYXRlIGEgcGFzdC1kZXBlbmRlbnQgc2lnbmFsLiBFYWNoIHZhbHVlIGdpdmVuIG9uIHRoZSBpbnB1dCBzaWduYWxcbi8vIHdpbGwgYmUgYWNjdW11bGF0ZWQsIHByb2R1Y2luZyBhIG5ldyBvdXRwdXQgdmFsdWUuXG5cbmZ1bmN0aW9uIEZvbGRQKHN0ZXAsIHZhbHVlLCBpbnB1dCkge1xuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXNbJHNvdXJjZV0gPSBpbnB1dFxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5zdGVwID0gc3RlcFxufVxuRm9sZFAucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlLCBzb3VyY2UpIHtcbiAgSW5wdXQucmVjZWl2ZShpbnB1dCwgaW5wdXQuc3RlcChpbnB1dC52YWx1ZSwgbWVzc2FnZSkpXG59XG5cbkZvbGRQLnByb3RvdHlwZSA9IG5ldyBJbnB1dCgpXG5Gb2xkUC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGb2xkUFxuRm9sZFAucHJvdG90eXBlWyRyZWNlaXZlXSA9IEZvbGRQLnJlY2VpdmVcblxuXG5mdW5jdGlvbiBmb2xkcChzdGVwLCB4LCB4cykge1xuICByZXR1cm4gbmV3IEZvbGRQKHN0ZXAsIHgsIHhzKVxufVxuZXhwb3J0cy5mb2xkcCA9IGZvbGRwXG5cblxuLy8gT3B0aW1pemVkIHZlcnNpb24gdGhhdCB0cmFja3Mgc2luZ2xlIGlucHV0LlxuZnVuY3Rpb24gTGlmdChzdGVwLCBpbnB1dCkge1xuICB0aGlzLnN0ZXAgPSBzdGVwXG4gIHRoaXNbJHNvdXJjZV0gPSBpbnB1dFxuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXMudmFsdWUgPSBzdGVwKGlucHV0LnZhbHVlKVxufVxuTGlmdC5yZWNlaXZlID0gZnVuY3Rpb24oaW5wdXQsIG1lc3NhZ2UpIHtcbiAgSW5wdXQucmVjZWl2ZShpbnB1dCwgaW5wdXQuc3RlcChtZXNzYWdlKSlcbn1cblxuTGlmdC5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuTGlmdC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBMaWZ0XG5MaWZ0LnByb3RvdHlwZVskcmVjZWl2ZV0gPSBMaWZ0LnJlY2VpdmVcblxuZnVuY3Rpb24gTGlmdE4oc3RlcCwgaW5wdXRzKSB7XG4gIHZhciBjb3VudCA9IGlucHV0cy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuICB2YXIgcGFyYW1zID0gQXJyYXkoY291bnQpXG4gIHdoaWxlIChpZCA8IGNvdW50KSB7XG4gICAgdmFyIGlucHV0ID0gaW5wdXRzW2lkXVxuICAgIHBhcmFtc1tpZF0gPSBpbnB1dC52YWx1ZVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbiAgdmFyIHZhbHVlID0gc3RlcC5hcHBseShzdGVwLCBwYXJhbXMpXG5cbiAgdGhpcy5zdGVwID0gc3RlcFxuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXNbJHNvdXJjZXNdID0gaW5wdXRzXG4gIHRoaXNbJHBlbmRpbmddID0gaW5wdXRzLmxlbmd0aFxuICB0aGlzWyRzdGF0ZV0gPSBwYXJhbXNcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5MaWZ0Ti5zdGFydCA9IE1lcmdlLnN0YXJ0XG5MaWZ0Ti5zdG9wID0gTWVyZ2Uuc3RvcFxuTGlmdE4uZW5kID0gTWVyZ2UuZW5kXG5cblxuTGlmdE4ucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlLCBzb3VyY2UpIHtcbiAgdmFyIHBhcmFtcyA9IGlucHV0WyRzdGF0ZV1cbiAgdmFyIGluZGV4ID0gaW5wdXRbJHNvdXJjZXNdLmluZGV4T2Yoc291cmNlKVxuICB2YXIgc3RlcCA9IGlucHV0LnN0ZXBcbiAgcGFyYW1zW2luZGV4XSA9IG1lc3NhZ2VcbiAgcmV0dXJuIElucHV0LnJlY2VpdmUoaW5wdXQsIHN0ZXAuYXBwbHkoc3RlcCwgcGFyYW1zKSlcbn1cblxuTGlmdE4ucHJvdG90eXBlID0gbmV3IElucHV0KClcbkxpZnROLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExpZnROXG5MaWZ0Ti5wcm90b3R5cGVbJHN0YXJ0XSA9IExpZnROLnN0YXJ0XG5MaWZ0Ti5wcm90b3R5cGVbJHN0b3BdID0gTGlmdE4uc3RvcFxuTGlmdE4ucHJvdG90eXBlWyRlbmRdID0gTGlmdE4uZW5kXG5MaWZ0Ti5wcm90b3R5cGVbJHJlY2VpdmVdID0gTGlmdE4ucmVjZWl2ZVxuXG52YXIgc2xpY2VyID0gW10uc2xpY2VcblxuLy8gVHJhbnNmb3JtIGdpdmVuIHNpZ25hbChzKSB3aXRoIGEgZ2l2ZW4gYHN0ZXBgIGZ1bmN0aW9uLlxuXG4vLyAoeCAtPiB5IC0+IC4uLikgLT4gU2lnbmFsIHggLT4gU2lnbmFsIHkgLT4gLi4uIC0+IFNpZ25hbCB6XG4vL1xuLy8geHMgICAgICAgICAgICAgIDotLXgtLS0tLXgtLS0tLXgtLS1cbi8vIGxpZnQoZiwgeHMpICAgICA6LS1mKHgpLS1mKHgpLS1mKHgpXG4vL1xuLy8geHMgICAgICAgICAgICAgIDotLXgtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXgtLS0tLS0tXG4vLyB5cyAgICAgICAgICAgICAgOi0tLS0tLS0tLS0teS0tLS0tLS0tLXktLS0tLS0tLS0tLS0tLS1cbi8vIGxpZnQoZiwgeHMsIHlzKSA6LS1mKHgsIHkpLS1mKHgsIHkpLS1mKHgsIHkpLS1mKHgsIHkpLVxuZnVuY3Rpb24gbGlmdChzdGVwLCB4cywgeXMpIHtcbiAgcmV0dXJuIHlzID8gbmV3IExpZnROKHN0ZXAsIHNsaWNlci5jYWxsKGFyZ3VtZW50cywgMSkpIDpcbiAgICAgICAgIG5ldyBMaWZ0KHN0ZXAsIHhzKVxufVxuZXhwb3J0cy5saWZ0ID0gbGlmdFxuZXhwb3J0cy5saWZ0MiA9IGxpZnRcbmV4cG9ydHMubGlmdDMgPSBsaWZ0XG5leHBvcnRzLmxpZnQ0ID0gbGlmdFxuZXhwb3J0cy5saWZ0NSA9IGxpZnRcbmV4cG9ydHMubGlmdDYgPSBsaWZ0XG5leHBvcnRzLmxpZnQ3ID0gbGlmdFxuZXhwb3J0cy5saWZ0OCA9IGxpZnRcbmV4cG9ydHMubGlmdE4gPSBsaWZ0XG5cblxuLy8gQ29tYmluZSBhIGFycmF5IG9mIHNpZ25hbHMgaW50byBhIHNpZ25hbCBvZiBhcnJheXMuXG5mdW5jdGlvbiBjb21iaW5lKGlucHV0cykge1xuICByZXR1cm4gbmV3IExpZnROKEFycmF5LCBpbnB1dHMpXG59XG5leHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lXG5cblxuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIGV2ZW50cyB0aGF0IGhhdmUgb2NjdXJlZC5cblxuLy8gU2lnbmFsIHggLT4gU2lnbmFsIEludFxuLy9cbi8vIHhzICAgICAgIDogIC0teC0teC0tLS14LS14LS0tLS0teFxuLy8gY291bnQoeHMpOiAgLS0xLS0yLS0tLTMtLTQtLS0tLS01XG5mdW5jdGlvbiBjb3VudCh4cykge1xuICByZXR1cm4gZm9sZHAoZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB4ICsgMVxuICB9LCAwLCB4cylcbn1cbmV4cG9ydHMuY291bnQgPSBjb3VudFxuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIGV2ZW50cyB0aGF0IGhhdmUgb2NjdXJlZCB0aGF0XG4vLyBzYXRpc2Z5IGEgZ2l2ZW4gcHJlZGljYXRlLlxuXG4vLyAoeCAtPiBCb29sKSAtPiBTaWduYWwgeCAtPiBTaWduYWwgSW50XG5mdW5jdGlvbiBjb3VudElmKHAsIHhzKSB7XG4gIHJldHVybiBjb3VudChrZWVwSWYocCwgeHMudmFsdWUsIHhzKSlcbn1cbmV4cG9ydHMuY291bnRJZiA9IGNvdW50SWZcblxuLy8gIyBGaWx0ZXJzXG5cbmZ1bmN0aW9uIEtlZXBJZihwLCB2YWx1ZSwgaW5wdXQpIHtcbiAgdGhpcy5wID0gcFxuICB0aGlzLnZhbHVlID0gcChpbnB1dC52YWx1ZSkgPyBpbnB1dC52YWx1ZSA6IHZhbHVlXG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlXSA9IGlucHV0XG59XG5LZWVwSWYucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlKSB7XG4gIGlmIChpbnB1dC5wKG1lc3NhZ2UpKVxuICAgIElucHV0LnJlY2VpdmUoaW5wdXQsIG1lc3NhZ2UpXG59XG5LZWVwSWYucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gS2VlcElmXG5LZWVwSWYucHJvdG90eXBlID0gbmV3IElucHV0KClcbktlZXBJZi5wcm90b3R5cGVbJHJlY2VpdmVdID0gS2VlcElmLnJlY2VpdmVcblxuLy8gS2VlcCBvbmx5IGV2ZW50cyB0aGF0IHNhdGlzZnkgdGhlIGdpdmVuIHByZWRpY2F0ZS5cbi8vIEVsbSBkb2VzIG5vdCBhbGxvdyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlIGNhc2Vcbi8vIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZSB0aGUgcHJlZGljYXRlIGlzIG5ldmVyIHNhdGlzZmllZC5cblxuLy8gKHggLT4gQm9vbCkgLT4geCAtPiBTaWduYWwgeCAtPiBTaWduYWwgeFxuZnVuY3Rpb24ga2VlcElmKHAsIHgsIHhzKSB7XG4gIHJldHVybiBuZXcgS2VlcElmKHAsIHgsIHhzKVxufVxuZXhwb3J0cy5rZWVwSWYgPSBrZWVwSWZcblxuXG5mdW5jdGlvbiBEcm9wSWYocCwgdmFsdWUsIGlucHV0KSB7XG4gIHRoaXMucCA9IHBcbiAgdGhpcy52YWx1ZSA9IHAoaW5wdXQudmFsdWUpID8gdmFsdWUgOiBpbnB1dC52YWx1ZVxuICB0aGlzWyRzb3VyY2VdID0gaW5wdXRcbiAgdGhpc1skb3V0cHV0c10gPSBbXVxufVxuRHJvcElmLnJlY2VpdmUgPSBmdW5jdGlvbihpbnB1dCwgbWVzc2FnZSkge1xuICBpZiAoIWlucHV0LnAobWVzc2FnZSkpXG4gICAgSW5wdXQucmVjZWl2ZShpbnB1dCwgbWVzc2FnZSlcbn1cbkRyb3BJZi5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuRHJvcElmLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERyb3BJZlxuRHJvcElmLnByb3RvdHlwZVskcmVjZWl2ZV0gPSBEcm9wSWYucmVjZWl2ZVxuXG4vLyBEcm9wIGV2ZW50cyB0aGF0IHNhdGlzZnkgdGhlIGdpdmVuIHByZWRpY2F0ZS4gRWxtIGRvZXMgbm90IGFsbG93XG4vLyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlIGNhc2UgbXVzdCBiZSBwcm92aWRlZCBpbiBjYXNlIHRoZVxuLy8gcHJlZGljYXRlIGlzIG5ldmVyIHNhdGlzZmllZC5cblxuLy8gKHggLT4gQm9vbCkgLT4geCAtPiBTaWduYWwgeCAtPiBTaWduYWwgeFxuZnVuY3Rpb24gZHJvcElmKHAsIHgsIHhzKSB7XG4gIHJldHVybiBuZXcgRHJvcElmKHAsIHgsIHhzKVxufVxuZXhwb3J0cy5kcm9wSWYgPSBkcm9wSWZcblxuXG4vLyBLZWVwIGV2ZW50cyBvbmx5IHdoZW4gdGhlIGZpcnN0IHNpZ25hbCBpcyB0cnVlLiBXaGVuIHRoZSBmaXJzdCBzaWduYWxcbi8vIGJlY29tZXMgdHJ1ZSwgdGhlIG1vc3QgcmVjZW50IHZhbHVlIG9mIHRoZSBzZWNvbmQgc2lnbmFsIHdpbGwgYmUgcHJvcGFnYXRlZC5cbi8vIFVudGlsIHRoZSBmaXJzdCBzaWduYWwgYmVjb21lcyBmYWxzZSBhZ2FpbiwgYWxsIGV2ZW50cyB3aWxsIGJlIHByb3BhZ2F0ZWQuXG4vLyBFbG0gZG9lcyBub3QgYWxsb3cgdW5kZWZpbmVkIHNpZ25hbHMsIHNvIGEgYmFzZSBjYXNlIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZVxuLy8gdGhlIGZpcnN0IHNpZ25hbCBpcyBuZXZlciB0cnVlLlxuXG4vLyBTaWduYWwgQm9vbCAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBTa2lwKCkgeyByZXR1cm4gU2tpcCB9XG5mdW5jdGlvbiBpc1NraXAoeCkgeyByZXR1cm4geCA9PT0gU2tpcCB9XG5mdW5jdGlvbiBza2lwSWZUcnVlKGlzVHJ1ZSwgeCkgeyByZXR1cm4gaXNUcnVlID8gU2tpcCA6IHggfVxuZnVuY3Rpb24gc2tpcElmRmFsc2UoaXNUcnVlLCB4KSB7IHJldHVybiBpc1RydWUgPyB4IDogU2tpcCB9XG5cbmZ1bmN0aW9uIGtlZXBXaGVuKHN0YXRlLCB4LCB4cykge1xuICB2YXIgaW5wdXQgPSBsaWZ0KHNraXBJZkZhbHNlLCBkcm9wUmVwZWF0cyhzdGF0ZSksIHhzKVxuICByZXR1cm4gZHJvcElmKGlzU2tpcCwgeCwgaW5wdXQpXG59XG5leHBvcnRzLmtlZXBXaGVuID0ga2VlcFdoZW5cblxuLy8gRHJvcCBldmVudHMgd2hlbiB0aGUgZmlyc3Qgc2lnbmFsIGlzIHRydWUuIFdoZW4gdGhlIGZpcnN0IHNpZ25hbFxuLy8gYmVjb21lcyBmYWxzZSwgdGhlIG1vc3QgcmVjZW50IHZhbHVlIG9mIHRoZSBzZWNvbmQgc2lnbmFsIHdpbGwgYmVcbi8vIHByb3BhZ2F0ZWQuIFVudGlsIHRoZSBmaXJzdCBzaWduYWwgYmVjb21lcyB0cnVlIGFnYWluLCBhbGwgZXZlbnRzXG4vLyB3aWxsIGJlIHByb3BhZ2F0ZWQuIEVsbSBkb2VzIG5vdCBhbGxvdyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlXG4vLyBjYXNlIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZSB0aGUgZmlyc3Qgc2lnbmFsIGlzIGFsd2F5cyB0cnVlLlxuXG4vLyBTaWduYWwgQm9vbCAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBkcm9wV2hlbihzdGF0ZSwgeCwgeHMpIHtcbiAgdmFyIGlucHV0ID0gbGlmdChza2lwSWZUcnVlLCBkcm9wUmVwZWF0cyhzdGF0ZSksIHhzKVxuICByZXR1cm4gZHJvcElmKGlzU2tpcCwgeCwgaW5wdXQpXG59XG5leHBvcnRzLmRyb3BXaGVuID0gZHJvcFdoZW5cblxuLy8gRHJvcCBzZXF1ZW50aWFsIHJlcGVhdGVkIHZhbHVlcy4gRm9yIGV4YW1wbGUsIGlmIGEgc2lnbmFsIHByb2R1Y2VzXG4vLyB0aGUgc2VxdWVuY2UgWzEsMSwyLDIsMV0sIGl0IGJlY29tZXMgWzEsMiwxXSBieSBkcm9wcGluZyB0aGUgdmFsdWVzXG4vLyB0aGF0IGFyZSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUuXG5cbi8vIFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBkcm9wUmVwZWF0cyh4cykge1xuICByZXR1cm4gZHJvcElmKGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geHMudmFsdWUgPT09IHhcbiAgfSwgeHMudmFsdWUsIHhzKVxufVxuZXhwb3J0cy5kcm9wUmVwZWF0cyA9IGRyb3BSZXBlYXRzXG5cbi8vIFNhbXBsZSBmcm9tIHRoZSBzZWNvbmQgaW5wdXQgZXZlcnkgdGltZSBhbiBldmVudCBvY2N1cnMgb24gdGhlIGZpcnN0XG4vLyBpbnB1dC4gRm9yIGV4YW1wbGUsIChzYW1wbGVPbiBjbGlja3MgKGV2ZXJ5IHNlY29uZCkpIHdpbGwgZ2l2ZSB0aGVcbi8vIGFwcHJveGltYXRlIHRpbWUgb2YgdGhlIGxhdGVzdCBjbGljay5cblxuLy8gU2lnbmFsIGEgLT4gU2lnbmFsIGIgLT4gU2lnbmFsIGJcbmZ1bmN0aW9uIHNhbXBsZU9uKHRpY2tzLCBpbnB1dCkge1xuICByZXR1cm4gbWVyZ2UoZHJvcElmKFRydWUsIGlucHV0LnZhbHVlLCBpbnB1dCksXG4gICAgICAgICAgICAgICBsaWZ0KGZ1bmN0aW9uKF8pIHsgcmV0dXJuIGlucHV0LnZhbHVlIH0sIHRpY2tzKSlcbn1cbmV4cG9ydHMuc2FtcGxlT24gPSBzYW1wbGVPblxuXG5mdW5jdGlvbiBUcnVlKCkgeyByZXR1cm4gdHJ1ZSB9XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIElucHV0ID0gcmVxdWlyZShcInJlZmxleC9zaWduYWxcIikuSW5wdXRcbnZhciBvbklucHV0ID0gcmVxdWlyZShcInJlZmxleC9ldmVudFwiKS5vbklucHV0XG52YXIgbm9kZSA9IHJlcXVpcmUoXCJyZWZsZXgvaHRtbFwiKS5ub2RlXG52YXIgZXZlbnROb2RlID0gcmVxdWlyZShcInJlZmxleC9odG1sXCIpLmV2ZW50Tm9kZVxudmFyIHRleHQgPSByZXF1aXJlKFwicmVmbGV4L2h0bWxcIikudGV4dFxudmFyIGxpZnQgPSByZXF1aXJlKFwicmVmbGV4L3NpZ25hbFwiKS5saWZ0XG52YXIgZm9sZHAgPSByZXF1aXJlKFwicmVmbGV4L3NpZ25hbFwiKS5mb2xkcFxudmFyIGFwcCA9IHJlcXVpcmUoXCJyZWZsZXgvYXBwXCIpLmFwcFxuXG5cbnZhciBhY3Rpb25zID0gbmV3IElucHV0KClcblxudmFyIGluaXQgPSB7IGZpZWxkOiBcIlwiIH1cblxudmFyIEFjdGlvbnMgPSB7XG4gIE5vT3A6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgcmV0dXJuIHN0YXRlXG4gICAgfVxuICB9LFxuICBVcGRhdGVGaWVsZDogZnVuY3Rpb24odGV4dCkge1xuICAgIHJldHVybiBmdW5jdGlvbihzdGF0ZSkge1xuICAgICAgcmV0dXJuIHtmaWVsZDogdGV4dH1cbiAgICB9XG4gIH1cbn1cblxuXG4vLyBzdGVwIDogU3RhdGUgLT4gQWN0aW9uIC0+IFN0YXRlXG52YXIgc3RlcCA9IGZ1bmN0aW9uKHN0YXRlLCBhY3Rpb24pIHtcbiAgcmV0dXJuIGFjdGlvbihzdGF0ZSlcbn1cblxudmFyIHN0YXRlID0gZm9sZHAoc3RlcCwgaW5pdCwgYWN0aW9ucylcblxudmFyIHF1ZXJ5RmllbGQgPSBmdW5jdGlvbih0ZXh0KSB7XG5cbiAgcmV0dXJuIGV2ZW50Tm9kZShcImlucHV0XCIsIHtcbiAgICBpZDogXCJxdWVyeS1ib3hcIixcbiAgICBjbGFzc05hbWU6IFwiaW5wdXQtYm94XCIsXG4gICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgdmFsdWU6IHRleHRcbiAgfSwgW10sIFtcbiAgICBvbklucHV0KGFjdGlvbnMsIEFjdGlvbnMuVXBkYXRlRmllbGQpXG4gIF0pXG59XG5cblxuXG52YXIgdmlldyA9IGZ1bmN0aW9uKHN0YXRlKSB7XG4gIHJldHVybiBub2RlKFwiZGl2XCIsIHt9LCBbXG4gICAgcXVlcnlGaWVsZChzdGF0ZS5maWVsZCksXG4gICAgbm9kZShcImRpdlwiLCB7Y2xhc3NOYW1lOiBcIm1pcnJvclwifSwgW1xuICAgICAgdGV4dChzdGF0ZS5maWVsZClcbiAgICBdKVxuICBdKVxufVxuXG52YXIgbWFpbiA9IGxpZnQodmlldywgc3RhdGUpXG5leHBvcnRzLm1haW4gPSBtYWluXG5cbmFwcChtYWluKVxuIl19
;