;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var listen = require("../listener").listen
var foldp = require("../signal").foldp
var start = require("../signal").start
var commit = require("vdom/patch")
var createElement = require("vdom/create-element")

function run(app, root) {
  if (root.children.length)
    throw Error("Not an empty element root is not supported")

  var events = listen(root)
  var task = foldp(function(tree, state) {
    return tree ? commit(tree, state) :
           root.appendChild(createElement(state))
  }, null, app.input(events))

  start(task)
}
exports.run = run

},{"../listener":3,"../signal":22,"vdom/create-element":6,"vdom/patch":12}],2:[function(require,module,exports){
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

},{"../signal":22}],3:[function(require,module,exports){
"use strict";

var read = require("./listener/read").read
var readers = require("./listener/read").readers
var Input = require("./signal").Input
var receive = require("./signal").receive


var eventTypes = Object.keys(readers);

var findEventTarget = function(event, root) {
  var targetAttribute = "data-reflex-event-" + event.type
  var node = event.target
  while (node !== root &&
         !node.hasAttribute(targetAttribute)) {
    node = node.parentNode
  }
  return node === root ? null : node
}

var listen = function(root) {
  var input = new Input()
  var listener = function(event) {
    var target = findEventTarget(event, root)
    if (target) {
      var path = target.getAttribute("data-reflex-path")
      var message = read(event)
      message.path = path
      message.type = event.type
      receive(input, message)
      return false
    }
  }

  eventTypes.forEach(function(type) {
    root.addEventListener(type, listener, false)
  })

  return input
}
exports.listen = listen

},{"./listener/read":4,"./signal":22}],4:[function(require,module,exports){
"use strict";

var read = function(event) {
  return readers[event.type](event)
}

var readEvent = function(event) {
  return {
    kind: "Event",
    timeStamp: event.timeStamp
  }
}

var readUIEvent = function(event) {
  return {
    kind: "UIEvent",
    timeStamp: event.timeStamp
  }
}

var readFocusEvent = function(event) {
  return {
    kind: "FocusEvent",
    timeStamp: event.timeStamp
  }
}

var readMouseEvent = function(event) {
  return {
    kind: "MouseEvent",
    timeStamp: event.timeStamp,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey
  }
}

var readKeyboardEvent = function(event) {
  return {
    kind: "KeyboardEvent",
    timeStamp: event.timeStamp,
    key: event.key,
    code: event.code,

    locale: event.locale,
    repeat: event.repeat,

    keyCode: event.keyCode,
    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey
  }
}

var readInputEvent = function(event) {
  return {
    kind: "Event",
    value: event.target.value,
    timeStamp: event.timeStamp
  }
}

var readClipboardEvent = function(event) {
  return {
    kind: "ClipboardEvent",
    clipboardData: event.clipboardData,
    timeStamp: event.timeStamp,
  }
}

var readDragEvent = function(event) {
  return {
    kind: "DragEvent",
    timeStamp: event.timeStamp,
    dataTransfer: event.dataTransfer,
    button: event.button,
    buttons: event.buttons,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey
  }
}

var readHashChangeEvent = function(event) {
  return {
    kind: "HashChangeEvent",
    timeStamp: event.timeStamp,
    oldURL: event.oldURL,
    newURL: event.newURL
  }
}

var readPageTransitionEvent = function(event) {
  return {
    kind: "PageTransitionEvent",
    timeStamp: event.timeStamp,
    persisted: event.persisted
  }
}

var readPopStateEvent = function(event) {
  return {
    kind: "PopStateEvent",
    timeStamp: event.timeStamp,
    state: event.state
  }
}

var readTouchEvent = function(event) {
  return {
    kind: "TouchEvent",
    timeStamp: event.timeStamp,

    // TODO: Serialize TouchList's properly.
    changedTouches: event.changedTouches,
    targetTouches: event.targetTouches,
    touches: event.touches,

    altKey: event.altKey,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
  }
}

// Event readers are based off:
// https://developer.mozilla.org/en-US/docs/Web/Events
var readers = {
  click: readMouseEvent,
  dbclick: readMouseEvent,
  mousemove: readMouseEvent,
  mousedown: readMouseEvent,
  mouseup: readMouseEvent,
  mouseenter: readMouseEvent,
  mouseleave: readMouseEvent,
  mouseover: readMouseEvent,
  mouseout: readMouseEvent,
  contextmenu: readMouseEvent,
  show: readMouseEvent,

  keyup: readKeyboardEvent,
  keydown: readKeyboardEvent,
  keypress: readKeyboardEvent,

  blur: readFocusEvent,
  focus: readFocusEvent,
  focusin: readFocusEvent,
  focusout: readFocusEvent,

  copy: readClipboardEvent,
  cut: readClipboardEvent,
  paste: readClipboardEvent,

  DOMContentLoaded: readEvent,
  load: readUIEvent,

  pagehide: readPageTransitionEvent,
  pageshow: readPageTransitionEvent,

  submit: readUIEvent,

  change: readInputEvent,
  input: readInputEvent,

  drag: readDragEvent,
  dragend: readDragEvent,
  dragenter: readDragEvent,
  dragleave: readDragEvent,
  dragover: readDragEvent,
  dragstart: readDragEvent,
  drop: readDragEvent,

  fullscreenchange: readEvent,
  resize: readUIEvent,

  scroll: readUIEvent,


  hashchange: readHashChangeEvent,
  popstate: readPopStateEvent,

  online: readEvent,
  offline: readEvent,

  touchcancel: readTouchEvent,
  touchend: readTouchEvent,
  touchenter: readTouchEvent,
  touchleave: readTouchEvent,
  touchmove: readTouchEvent,
  touchstart: readTouchEvent
}

exports.readers = readers
exports.read = read


},{}],5:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("vtree/is-vhook")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, props, previous, propName);
        } else if (isHook(propValue)) {
            propValue.hook(node,
                propName,
                previous ? previous[propName] : undefined)
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else if (propValue !== undefined) {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, props, previous, propName) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
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

},{"is-object":9,"vtree/is-vhook":16}],6:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("vtree/is-vnode")
var isVText = require("vtree/is-vtext")
var isWidget = require("vtree/is-widget")
var handleThunk = require("vtree/handle-thunk")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"./apply-properties":5,"global/document":8,"vtree/handle-thunk":14,"vtree/is-vnode":17,"vtree/is-vtext":18,"vtree/is-widget":19}],7:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],8:[function(require,module,exports){
var global=typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

},{"min-document":24}],9:[function(require,module,exports){
module.exports = isObject

function isObject(x) {
    return typeof x === "object" && x !== null
}

},{}],10:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],11:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("vtree/is-widget")
var VPatch = require("vtree/vpatch")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    if (updateWidget(leftVNode, widget)) {
        return widget.update(leftVNode, domNode) || domNode
    }

    var parentNode = domNode.parentNode
    var newWidget = render(widget, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newWidget, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newWidget
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    destroyWidget(domNode, leftVNode)

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, bIndex) {
    var children = []
    var childNodes = domNode.childNodes
    var len = childNodes.length
    var i
    var reverseIndex = bIndex.reverse

    for (i = 0; i < len; i++) {
        children.push(domNode.childNodes[i])
    }

    var insertOffset = 0
    var move
    var node
    var insertNode
    for (i = 0; i < len; i++) {
        move = bIndex[i]
        if (move !== undefined && move !== i) {
            // the element currently at this index will be moved later so increase the insert offset
            if (reverseIndex[i] > i) {
                insertOffset++
            }

            node = children[move]
            insertNode = childNodes[i + insertOffset] || null
            if (node !== insertNode) {
                domNode.insertBefore(node, insertNode)
            }

            // the moved element came from the front of the array so reduce the insert offset
            if (move < i) {
                insertOffset--
            }
        }

        // element at this index is scheduled to be removed so increase insert offset
        if (i in bIndex.removes) {
            insertOffset++
        }
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        console.log(oldRoot)
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"./apply-properties":5,"./create-element":6,"./update-widget":13,"vtree/is-widget":19,"vtree/vpatch":21}],12:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":7,"./patch-op":11,"global/document":8,"x-is-array":10}],13:[function(require,module,exports){
var isWidget = require("vtree/is-widget")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"vtree/is-widget":19}],14:[function(require,module,exports){
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

},{"./is-thunk":15,"./is-vnode":17,"./is-vtext":18,"./is-widget":19}],15:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],16:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook && typeof hook.hook === "function" &&
        !hook.hasOwnProperty("hook")
}

},{}],17:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":20}],18:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":20}],19:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],20:[function(require,module,exports){
module.exports = "1"

},{}],21:[function(require,module,exports){
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

},{"./version":20}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
"use strict";

var run = require("reflex/app/runner").run
var AppWorker = require("reflex/app/worker").AppWorker

run(new AppWorker("./app-bundle.js"), document.getElementById("app"))

},{"reflex/app/runner":1,"reflex/app/worker":2}],24:[function(require,module,exports){

},{}]},{},[23])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvYXBwL3J1bm5lci5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9hcHAvd29ya2VyLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2xpc3RlbmVyLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L2xpc3RlbmVyL3JlYWQuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdmRvbS9jcmVhdGUtZWxlbWVudC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdmRvbS9kb20taW5kZXguanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Zkb20vbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdmRvbS9ub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92ZG9tL25vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLW9wLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92ZG9tL3BhdGNoLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2hhbmRsZS10aHVuay5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdGh1bmsuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXZob29rLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L25vZGVfbW9kdWxlcy92dHJlZS9pcy12bm9kZS5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvaXMtdnRleHQuanMiLCIvVXNlcnMvZ296YWxhL1Byb2plY3RzL25vZGVfbW9kdWxlcy9yZWZsZXgvbm9kZV9tb2R1bGVzL3Z0cmVlL2lzLXdpZGdldC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvdmVyc2lvbi5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvbm9kZV9tb2R1bGVzL3JlZmxleC9ub2RlX21vZHVsZXMvdnRyZWUvdnBhdGNoLmpzIiwiL1VzZXJzL2dvemFsYS9Qcm9qZWN0cy9ub2RlX21vZHVsZXMvcmVmbGV4L3NpZ25hbC5qcyIsIi9Vc2Vycy9nb3phbGEvUHJvamVjdHMvcmVmbGV4L2V4YW1wbGVzL3F1ZXJ5LWZpZWxkL21haW4uanMiLCIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbGtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQSIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbGlzdGVuID0gcmVxdWlyZShcIi4uL2xpc3RlbmVyXCIpLmxpc3RlblxudmFyIGZvbGRwID0gcmVxdWlyZShcIi4uL3NpZ25hbFwiKS5mb2xkcFxudmFyIHN0YXJ0ID0gcmVxdWlyZShcIi4uL3NpZ25hbFwiKS5zdGFydFxudmFyIGNvbW1pdCA9IHJlcXVpcmUoXCJ2ZG9tL3BhdGNoXCIpXG52YXIgY3JlYXRlRWxlbWVudCA9IHJlcXVpcmUoXCJ2ZG9tL2NyZWF0ZS1lbGVtZW50XCIpXG5cbmZ1bmN0aW9uIHJ1bihhcHAsIHJvb3QpIHtcbiAgaWYgKHJvb3QuY2hpbGRyZW4ubGVuZ3RoKVxuICAgIHRocm93IEVycm9yKFwiTm90IGFuIGVtcHR5IGVsZW1lbnQgcm9vdCBpcyBub3Qgc3VwcG9ydGVkXCIpXG5cbiAgdmFyIGV2ZW50cyA9IGxpc3Rlbihyb290KVxuICB2YXIgdGFzayA9IGZvbGRwKGZ1bmN0aW9uKHRyZWUsIHN0YXRlKSB7XG4gICAgcmV0dXJuIHRyZWUgPyBjb21taXQodHJlZSwgc3RhdGUpIDpcbiAgICAgICAgICAgcm9vdC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KHN0YXRlKSlcbiAgfSwgbnVsbCwgYXBwLmlucHV0KGV2ZW50cykpXG5cbiAgc3RhcnQodGFzaylcbn1cbmV4cG9ydHMucnVuID0gcnVuXG4iLCJ2YXIgc2lnbmFsID0gcmVxdWlyZShcIi4uL3NpZ25hbFwiKSxcbiAgICBJbnB1dCA9IHNpZ25hbC5JbnB1dCxcbiAgICBzdGFydCA9IHNpZ25hbC5zdGFydCxcbiAgICBzdG9wID0gc2lnbmFsLnN0b3AsXG4gICAgcmVjZWl2ZSA9IHNpZ25hbC5yZWNlaXZlXG5cbnZhciBXb3JrZXJJbnB1dCA9IGZ1bmN0aW9uKHBhdGgsIGV2ZW50cykge1xuICB0aGlzLnBhdGggPSBwYXRoXG4gIHRoaXMub25NZXNzYWdlID0gdGhpcy5vbk1lc3NhZ2UuYmluZCh0aGlzLCB0aGlzKVxuICBJbnB1dC5jYWxsKHRoaXMsIGV2ZW50cylcbn1cbldvcmtlcklucHV0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoSW5wdXQucHJvdG90eXBlKVxuV29ya2VySW5wdXQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV29ya2VySW5wdXRcblxuV29ya2VySW5wdXQucmVjZWl2ZSA9IGZ1bmN0aW9uKHRhcmdldCwgbWVzc2FnZSwgc291cmNlKSB7XG4gIHRhcmdldC53b3JrZXIucG9zdE1lc3NhZ2UobWVzc2FnZSlcbn1cbldvcmtlcklucHV0LnByb3RvdHlwZVtyZWNlaXZlXSA9IFdvcmtlcklucHV0LnJlY2VpdmVcblxuV29ya2VySW5wdXQuc3RhcnQgPSBmdW5jdGlvbih0YXJnZXQpIHtcbiAgdGFyZ2V0LndvcmtlciA9IG5ldyBXb3JrZXIodGFyZ2V0LnBhdGgpXG4gIHRhcmdldC53b3JrZXIub25tZXNzYWdlID0gdGFyZ2V0Lm9uTWVzc2FnZVxuICBJbnB1dC5zdGFydCh0YXJnZXQpXG59XG5Xb3JrZXJJbnB1dC5wcm90b3R5cGVbc3RhcnRdID0gV29ya2VySW5wdXQuc3RhcnRcblxuV29ya2VySW5wdXQuc3RvcCA9IGZ1bmN0aW9uKHRhcmdldCkge1xuICB0YXJnZXQud29ya2VyLnRlcm1pbmF0ZSgpXG4gIElucHV0LnN0b3AodGFyZ2V0KVxufVxuV29ya2VySW5wdXQucHJvdG90eXBlW3N0b3BdID0gV29ya2VySW5wdXQuc3RvcFxuXG5Xb3JrZXJJbnB1dC5wcm90b3R5cGUub25NZXNzYWdlID0gZnVuY3Rpb24odGFyZ2V0LCBldmVudCkge1xuICBJbnB1dC5yZWNlaXZlKHRhcmdldCwgZXZlbnQuZGF0YSlcbn1cblxuZXhwb3J0cy5Xb3JrZXJJbnB1dCA9IFdvcmtlcklucHV0XG5cbnZhciBBcHBXb3JrZXIgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHRoaXMucGF0aCA9IHBhdGhcbn1cbkFwcFdvcmtlci5wcm90b3R5cGUuaW5wdXQgPSBmdW5jdGlvbihldmVudHMpIHtcbiAgcmV0dXJuIG5ldyBXb3JrZXJJbnB1dCh0aGlzLnBhdGgsIGV2ZW50cylcbn1cblxuZXhwb3J0cy5BcHBXb3JrZXIgPSBBcHBXb3JrZXJcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgcmVhZCA9IHJlcXVpcmUoXCIuL2xpc3RlbmVyL3JlYWRcIikucmVhZFxudmFyIHJlYWRlcnMgPSByZXF1aXJlKFwiLi9saXN0ZW5lci9yZWFkXCIpLnJlYWRlcnNcbnZhciBJbnB1dCA9IHJlcXVpcmUoXCIuL3NpZ25hbFwiKS5JbnB1dFxudmFyIHJlY2VpdmUgPSByZXF1aXJlKFwiLi9zaWduYWxcIikucmVjZWl2ZVxuXG5cbnZhciBldmVudFR5cGVzID0gT2JqZWN0LmtleXMocmVhZGVycyk7XG5cbnZhciBmaW5kRXZlbnRUYXJnZXQgPSBmdW5jdGlvbihldmVudCwgcm9vdCkge1xuICB2YXIgdGFyZ2V0QXR0cmlidXRlID0gXCJkYXRhLXJlZmxleC1ldmVudC1cIiArIGV2ZW50LnR5cGVcbiAgdmFyIG5vZGUgPSBldmVudC50YXJnZXRcbiAgd2hpbGUgKG5vZGUgIT09IHJvb3QgJiZcbiAgICAgICAgICFub2RlLmhhc0F0dHJpYnV0ZSh0YXJnZXRBdHRyaWJ1dGUpKSB7XG4gICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZVxuICB9XG4gIHJldHVybiBub2RlID09PSByb290ID8gbnVsbCA6IG5vZGVcbn1cblxudmFyIGxpc3RlbiA9IGZ1bmN0aW9uKHJvb3QpIHtcbiAgdmFyIGlucHV0ID0gbmV3IElucHV0KClcbiAgdmFyIGxpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZmluZEV2ZW50VGFyZ2V0KGV2ZW50LCByb290KVxuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIHZhciBwYXRoID0gdGFyZ2V0LmdldEF0dHJpYnV0ZShcImRhdGEtcmVmbGV4LXBhdGhcIilcbiAgICAgIHZhciBtZXNzYWdlID0gcmVhZChldmVudClcbiAgICAgIG1lc3NhZ2UucGF0aCA9IHBhdGhcbiAgICAgIG1lc3NhZ2UudHlwZSA9IGV2ZW50LnR5cGVcbiAgICAgIHJlY2VpdmUoaW5wdXQsIG1lc3NhZ2UpXG4gICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG4gIH1cblxuICBldmVudFR5cGVzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lciwgZmFsc2UpXG4gIH0pXG5cbiAgcmV0dXJuIGlucHV0XG59XG5leHBvcnRzLmxpc3RlbiA9IGxpc3RlblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciByZWFkID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIHJlYWRlcnNbZXZlbnQudHlwZV0oZXZlbnQpXG59XG5cbnZhciByZWFkRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFwiRXZlbnRcIixcbiAgICB0aW1lU3RhbXA6IGV2ZW50LnRpbWVTdGFtcFxuICB9XG59XG5cbnZhciByZWFkVUlFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJVSUV2ZW50XCIsXG4gICAgdGltZVN0YW1wOiBldmVudC50aW1lU3RhbXBcbiAgfVxufVxuXG52YXIgcmVhZEZvY3VzRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFwiRm9jdXNFdmVudFwiLFxuICAgIHRpbWVTdGFtcDogZXZlbnQudGltZVN0YW1wXG4gIH1cbn1cblxudmFyIHJlYWRNb3VzZUV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBcIk1vdXNlRXZlbnRcIixcbiAgICB0aW1lU3RhbXA6IGV2ZW50LnRpbWVTdGFtcCxcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGFsdEtleTogZXZlbnQuYWx0S2V5LFxuICAgIGN0cmxLZXk6IGV2ZW50LmN0cmxLZXksXG4gICAgbWV0YUtleTogZXZlbnQubWV0YUtleSxcbiAgICBzaGlmdEtleTogZXZlbnQuc2hpZnRLZXlcbiAgfVxufVxuXG52YXIgcmVhZEtleWJvYXJkRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFwiS2V5Ym9hcmRFdmVudFwiLFxuICAgIHRpbWVTdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIGtleTogZXZlbnQua2V5LFxuICAgIGNvZGU6IGV2ZW50LmNvZGUsXG5cbiAgICBsb2NhbGU6IGV2ZW50LmxvY2FsZSxcbiAgICByZXBlYXQ6IGV2ZW50LnJlcGVhdCxcblxuICAgIGtleUNvZGU6IGV2ZW50LmtleUNvZGUsXG4gICAgYWx0S2V5OiBldmVudC5hbHRLZXksXG4gICAgY3RybEtleTogZXZlbnQuY3RybEtleSxcbiAgICBtZXRhS2V5OiBldmVudC5tZXRhS2V5LFxuICAgIHNoaWZ0S2V5OiBldmVudC5zaGlmdEtleVxuICB9XG59XG5cbnZhciByZWFkSW5wdXRFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJFdmVudFwiLFxuICAgIHZhbHVlOiBldmVudC50YXJnZXQudmFsdWUsXG4gICAgdGltZVN0YW1wOiBldmVudC50aW1lU3RhbXBcbiAgfVxufVxuXG52YXIgcmVhZENsaXBib2FyZEV2ZW50ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIHtcbiAgICBraW5kOiBcIkNsaXBib2FyZEV2ZW50XCIsXG4gICAgY2xpcGJvYXJkRGF0YTogZXZlbnQuY2xpcGJvYXJkRGF0YSxcbiAgICB0aW1lU3RhbXA6IGV2ZW50LnRpbWVTdGFtcCxcbiAgfVxufVxuXG52YXIgcmVhZERyYWdFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJEcmFnRXZlbnRcIixcbiAgICB0aW1lU3RhbXA6IGV2ZW50LnRpbWVTdGFtcCxcbiAgICBkYXRhVHJhbnNmZXI6IGV2ZW50LmRhdGFUcmFuc2ZlcixcbiAgICBidXR0b246IGV2ZW50LmJ1dHRvbixcbiAgICBidXR0b25zOiBldmVudC5idXR0b25zLFxuICAgIGN0cmxLZXk6IGV2ZW50LmN0cmxLZXksXG4gICAgc2hpZnRLZXk6IGV2ZW50LnNoaWZ0S2V5LFxuICAgIGFsdEtleTogZXZlbnQuYWx0S2V5LFxuICAgIG1ldGFLZXk6IGV2ZW50Lm1ldGFLZXlcbiAgfVxufVxuXG52YXIgcmVhZEhhc2hDaGFuZ2VFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJIYXNoQ2hhbmdlRXZlbnRcIixcbiAgICB0aW1lU3RhbXA6IGV2ZW50LnRpbWVTdGFtcCxcbiAgICBvbGRVUkw6IGV2ZW50Lm9sZFVSTCxcbiAgICBuZXdVUkw6IGV2ZW50Lm5ld1VSTFxuICB9XG59XG5cbnZhciByZWFkUGFnZVRyYW5zaXRpb25FdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJQYWdlVHJhbnNpdGlvbkV2ZW50XCIsXG4gICAgdGltZVN0YW1wOiBldmVudC50aW1lU3RhbXAsXG4gICAgcGVyc2lzdGVkOiBldmVudC5wZXJzaXN0ZWRcbiAgfVxufVxuXG52YXIgcmVhZFBvcFN0YXRlRXZlbnQgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4ge1xuICAgIGtpbmQ6IFwiUG9wU3RhdGVFdmVudFwiLFxuICAgIHRpbWVTdGFtcDogZXZlbnQudGltZVN0YW1wLFxuICAgIHN0YXRlOiBldmVudC5zdGF0ZVxuICB9XG59XG5cbnZhciByZWFkVG91Y2hFdmVudCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB7XG4gICAga2luZDogXCJUb3VjaEV2ZW50XCIsXG4gICAgdGltZVN0YW1wOiBldmVudC50aW1lU3RhbXAsXG5cbiAgICAvLyBUT0RPOiBTZXJpYWxpemUgVG91Y2hMaXN0J3MgcHJvcGVybHkuXG4gICAgY2hhbmdlZFRvdWNoZXM6IGV2ZW50LmNoYW5nZWRUb3VjaGVzLFxuICAgIHRhcmdldFRvdWNoZXM6IGV2ZW50LnRhcmdldFRvdWNoZXMsXG4gICAgdG91Y2hlczogZXZlbnQudG91Y2hlcyxcblxuICAgIGFsdEtleTogZXZlbnQuYWx0S2V5LFxuICAgIGN0cmxLZXk6IGV2ZW50LmN0cmxLZXksXG4gICAgbWV0YUtleTogZXZlbnQubWV0YUtleSxcbiAgICBzaGlmdEtleTogZXZlbnQuc2hpZnRLZXksXG4gIH1cbn1cblxuLy8gRXZlbnQgcmVhZGVycyBhcmUgYmFzZWQgb2ZmOlxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzXG52YXIgcmVhZGVycyA9IHtcbiAgY2xpY2s6IHJlYWRNb3VzZUV2ZW50LFxuICBkYmNsaWNrOiByZWFkTW91c2VFdmVudCxcbiAgbW91c2Vtb3ZlOiByZWFkTW91c2VFdmVudCxcbiAgbW91c2Vkb3duOiByZWFkTW91c2VFdmVudCxcbiAgbW91c2V1cDogcmVhZE1vdXNlRXZlbnQsXG4gIG1vdXNlZW50ZXI6IHJlYWRNb3VzZUV2ZW50LFxuICBtb3VzZWxlYXZlOiByZWFkTW91c2VFdmVudCxcbiAgbW91c2VvdmVyOiByZWFkTW91c2VFdmVudCxcbiAgbW91c2VvdXQ6IHJlYWRNb3VzZUV2ZW50LFxuICBjb250ZXh0bWVudTogcmVhZE1vdXNlRXZlbnQsXG4gIHNob3c6IHJlYWRNb3VzZUV2ZW50LFxuXG4gIGtleXVwOiByZWFkS2V5Ym9hcmRFdmVudCxcbiAga2V5ZG93bjogcmVhZEtleWJvYXJkRXZlbnQsXG4gIGtleXByZXNzOiByZWFkS2V5Ym9hcmRFdmVudCxcblxuICBibHVyOiByZWFkRm9jdXNFdmVudCxcbiAgZm9jdXM6IHJlYWRGb2N1c0V2ZW50LFxuICBmb2N1c2luOiByZWFkRm9jdXNFdmVudCxcbiAgZm9jdXNvdXQ6IHJlYWRGb2N1c0V2ZW50LFxuXG4gIGNvcHk6IHJlYWRDbGlwYm9hcmRFdmVudCxcbiAgY3V0OiByZWFkQ2xpcGJvYXJkRXZlbnQsXG4gIHBhc3RlOiByZWFkQ2xpcGJvYXJkRXZlbnQsXG5cbiAgRE9NQ29udGVudExvYWRlZDogcmVhZEV2ZW50LFxuICBsb2FkOiByZWFkVUlFdmVudCxcblxuICBwYWdlaGlkZTogcmVhZFBhZ2VUcmFuc2l0aW9uRXZlbnQsXG4gIHBhZ2VzaG93OiByZWFkUGFnZVRyYW5zaXRpb25FdmVudCxcblxuICBzdWJtaXQ6IHJlYWRVSUV2ZW50LFxuXG4gIGNoYW5nZTogcmVhZElucHV0RXZlbnQsXG4gIGlucHV0OiByZWFkSW5wdXRFdmVudCxcblxuICBkcmFnOiByZWFkRHJhZ0V2ZW50LFxuICBkcmFnZW5kOiByZWFkRHJhZ0V2ZW50LFxuICBkcmFnZW50ZXI6IHJlYWREcmFnRXZlbnQsXG4gIGRyYWdsZWF2ZTogcmVhZERyYWdFdmVudCxcbiAgZHJhZ292ZXI6IHJlYWREcmFnRXZlbnQsXG4gIGRyYWdzdGFydDogcmVhZERyYWdFdmVudCxcbiAgZHJvcDogcmVhZERyYWdFdmVudCxcblxuICBmdWxsc2NyZWVuY2hhbmdlOiByZWFkRXZlbnQsXG4gIHJlc2l6ZTogcmVhZFVJRXZlbnQsXG5cbiAgc2Nyb2xsOiByZWFkVUlFdmVudCxcblxuXG4gIGhhc2hjaGFuZ2U6IHJlYWRIYXNoQ2hhbmdlRXZlbnQsXG4gIHBvcHN0YXRlOiByZWFkUG9wU3RhdGVFdmVudCxcblxuICBvbmxpbmU6IHJlYWRFdmVudCxcbiAgb2ZmbGluZTogcmVhZEV2ZW50LFxuXG4gIHRvdWNoY2FuY2VsOiByZWFkVG91Y2hFdmVudCxcbiAgdG91Y2hlbmQ6IHJlYWRUb3VjaEV2ZW50LFxuICB0b3VjaGVudGVyOiByZWFkVG91Y2hFdmVudCxcbiAgdG91Y2hsZWF2ZTogcmVhZFRvdWNoRXZlbnQsXG4gIHRvdWNobW92ZTogcmVhZFRvdWNoRXZlbnQsXG4gIHRvdWNoc3RhcnQ6IHJlYWRUb3VjaEV2ZW50XG59XG5cbmV4cG9ydHMucmVhZGVycyA9IHJlYWRlcnNcbmV4cG9ydHMucmVhZCA9IHJlYWRcblxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12aG9va1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UHJvcGVydGllc1xuXG5mdW5jdGlvbiBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMsIHByZXZpb3VzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgICAgIHByb3BWYWx1ZS5ob29rKG5vZGUsXG4gICAgICAgICAgICAgICAgcHJvcE5hbWUsXG4gICAgICAgICAgICAgICAgcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWQpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QocHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSkge1xuICAgIGlmIChwcmV2aW91cykge1xuICAgICAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmICghaXNIb29rKHByZXZpb3VzVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3BOYW1lID09PSBcInN0eWxlXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZVtpXSA9IFwiXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBwcmV2aW91c1ZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBcIlwiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gbnVsbFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwYXRjaE9iamVjdChub2RlLCBwcm9wcywgcHJldmlvdXMsIHByb3BOYW1lLCBwcm9wVmFsdWUpIHtcbiAgICB2YXIgcHJldmlvdXNWYWx1ZSA9IHByZXZpb3VzID8gcHJldmlvdXNbcHJvcE5hbWVdIDogdW5kZWZpbmVkXG5cbiAgICAvLyBTZXQgYXR0cmlidXRlc1xuICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgZm9yICh2YXIgYXR0ck5hbWUgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgYXR0clZhbHVlID0gcHJvcFZhbHVlW2F0dHJOYW1lXVxuXG4gICAgICAgICAgICBpZiAoYXR0clZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmKHByZXZpb3VzVmFsdWUgJiYgaXNPYmplY3QocHJldmlvdXNWYWx1ZSkgJiZcbiAgICAgICAgZ2V0UHJvdG90eXBlKHByZXZpb3VzVmFsdWUpICE9PSBnZXRQcm90b3R5cGUocHJvcFZhbHVlKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHByb3BWYWx1ZVxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZiAoIWlzT2JqZWN0KG5vZGVbcHJvcE5hbWVdKSkge1xuICAgICAgICBub2RlW3Byb3BOYW1lXSA9IHt9XG4gICAgfVxuXG4gICAgdmFyIHJlcGxhY2VyID0gcHJvcE5hbWUgPT09IFwic3R5bGVcIiA/IFwiXCIgOiB1bmRlZmluZWRcblxuICAgIGZvciAodmFyIGsgaW4gcHJvcFZhbHVlKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHByb3BWYWx1ZVtrXVxuICAgICAgICBub2RlW3Byb3BOYW1lXVtrXSA9ICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSA/IHJlcGxhY2VyIDogdmFsdWVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFByb3RvdHlwZSh2YWx1ZSkge1xuICAgIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSlcbiAgICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgICAgICByZXR1cm4gdmFsdWUuX19wcm90b19fXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgICAgICByZXR1cm4gdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlXG4gICAgfVxufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgYXBwbHlQcm9wZXJ0aWVzID0gcmVxdWlyZShcIi4vYXBwbHktcHJvcGVydGllc1wiKVxuXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCJ2dHJlZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwidnRyZWUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCJ2dHJlZS9pcy13aWRnZXRcIilcbnZhciBoYW5kbGVUaHVuayA9IHJlcXVpcmUoXCJ2dHJlZS9oYW5kbGUtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQodm5vZGUsIG9wdHMpIHtcbiAgICB2YXIgZG9jID0gb3B0cyA/IG9wdHMuZG9jdW1lbnQgfHwgZG9jdW1lbnQgOiBkb2N1bWVudFxuICAgIHZhciB3YXJuID0gb3B0cyA/IG9wdHMud2FybiA6IG51bGxcblxuICAgIHZub2RlID0gaGFuZGxlVGh1bmsodm5vZGUpLmFcblxuICAgIGlmIChpc1dpZGdldCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIHZub2RlLmluaXQoKVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dCh2bm9kZSkpIHtcbiAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVUZXh0Tm9kZSh2bm9kZS50ZXh0KVxuICAgIH0gZWxzZSBpZiAoIWlzVk5vZGUodm5vZGUpKSB7XG4gICAgICAgIGlmICh3YXJuKSB7XG4gICAgICAgICAgICB3YXJuKFwiSXRlbSBpcyBub3QgYSB2YWxpZCB2aXJ0dWFsIGRvbSBub2RlXCIsIHZub2RlKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSAodm5vZGUubmFtZXNwYWNlID09PSBudWxsKSA/XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50KHZub2RlLnRhZ05hbWUpIDpcbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnROUyh2bm9kZS5uYW1lc3BhY2UsIHZub2RlLnRhZ05hbWUpXG5cbiAgICB2YXIgcHJvcHMgPSB2bm9kZS5wcm9wZXJ0aWVzXG4gICAgYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzKVxuXG4gICAgdmFyIGNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkTm9kZSA9IGNyZWF0ZUVsZW1lbnQoY2hpbGRyZW5baV0sIG9wdHMpXG4gICAgICAgIGlmIChjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVcbn1cbiIsIi8vIE1hcHMgYSB2aXJ0dWFsIERPTSB0cmVlIG9udG8gYSByZWFsIERPTSB0cmVlIGluIGFuIGVmZmljaWVudCBtYW5uZXIuXG4vLyBXZSBkb24ndCB3YW50IHRvIHJlYWQgYWxsIG9mIHRoZSBET00gbm9kZXMgaW4gdGhlIHRyZWUgc28gd2UgdXNlXG4vLyB0aGUgaW4tb3JkZXIgdHJlZSBpbmRleGluZyB0byBlbGltaW5hdGUgcmVjdXJzaW9uIGRvd24gY2VydGFpbiBicmFuY2hlcy5cbi8vIFdlIG9ubHkgcmVjdXJzZSBpbnRvIGEgRE9NIG5vZGUgaWYgd2Uga25vdyB0aGF0IGl0IGNvbnRhaW5zIGEgY2hpbGQgb2Zcbi8vIGludGVyZXN0LlxuXG52YXIgbm9DaGlsZCA9IHt9XG5cbm1vZHVsZS5leHBvcnRzID0gZG9tSW5kZXhcblxuZnVuY3Rpb24gZG9tSW5kZXgocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzKSB7XG4gICAgaWYgKCFpbmRpY2VzIHx8IGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB7fVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGljZXMuc29ydChhc2NlbmRpbmcpXG4gICAgICAgIHJldHVybiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2RlcywgMClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpIHtcbiAgICBub2RlcyA9IG5vZGVzIHx8IHt9XG5cblxuICAgIGlmIChyb290Tm9kZSkge1xuICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgcm9vdEluZGV4KSkge1xuICAgICAgICAgICAgbm9kZXNbcm9vdEluZGV4XSA9IHJvb3ROb2RlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdkNoaWxkcmVuID0gdHJlZS5jaGlsZHJlblxuXG4gICAgICAgIGlmICh2Q2hpbGRyZW4pIHtcblxuICAgICAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSByb290Tm9kZS5jaGlsZE5vZGVzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHJvb3RJbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB2YXIgdkNoaWxkID0gdkNoaWxkcmVuW2ldIHx8IG5vQ2hpbGRcbiAgICAgICAgICAgICAgICB2YXIgbmV4dEluZGV4ID0gcm9vdEluZGV4ICsgKHZDaGlsZC5jb3VudCB8fCAwKVxuXG4gICAgICAgICAgICAgICAgLy8gc2tpcCByZWN1cnNpb24gZG93biB0aGUgdHJlZSBpZiB0aGVyZSBhcmUgbm8gbm9kZXMgZG93biBoZXJlXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIG5leHRJbmRleCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVjdXJzZShjaGlsZE5vZGVzW2ldLCB2Q2hpbGQsIGluZGljZXMsIG5vZGVzLCByb290SW5kZXgpXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ID0gbmV4dEluZGV4XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZXNcbn1cblxuLy8gQmluYXJ5IHNlYXJjaCBmb3IgYW4gaW5kZXggaW4gdGhlIGludGVydmFsIFtsZWZ0LCByaWdodF1cbmZ1bmN0aW9uIGluZGV4SW5SYW5nZShpbmRpY2VzLCBsZWZ0LCByaWdodCkge1xuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICB9XG5cbiAgICB2YXIgbWluSW5kZXggPSAwXG4gICAgdmFyIG1heEluZGV4ID0gaW5kaWNlcy5sZW5ndGggLSAxXG4gICAgdmFyIGN1cnJlbnRJbmRleFxuICAgIHZhciBjdXJyZW50SXRlbVxuXG4gICAgd2hpbGUgKG1pbkluZGV4IDw9IG1heEluZGV4KSB7XG4gICAgICAgIGN1cnJlbnRJbmRleCA9ICgobWF4SW5kZXggKyBtaW5JbmRleCkgLyAyKSA+PiAwXG4gICAgICAgIGN1cnJlbnRJdGVtID0gaW5kaWNlc1tjdXJyZW50SW5kZXhdXG5cbiAgICAgICAgaWYgKG1pbkluZGV4ID09PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIGN1cnJlbnRJdGVtID49IGxlZnQgJiYgY3VycmVudEl0ZW0gPD0gcmlnaHRcbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50SXRlbSA8IGxlZnQpIHtcbiAgICAgICAgICAgIG1pbkluZGV4ID0gY3VycmVudEluZGV4ICsgMVxuICAgICAgICB9IGVsc2UgIGlmIChjdXJyZW50SXRlbSA+IHJpZ2h0KSB7XG4gICAgICAgICAgICBtYXhJbmRleCA9IGN1cnJlbnRJbmRleCAtIDFcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgcmV0dXJuIGEgPiBiID8gMSA6IC0xXG59XG4iLCJ2YXIgZ2xvYmFsPXR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fTt2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc09iamVjdFxuXG5mdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGxcbn1cbiIsInZhciBuYXRpdmVJc0FycmF5ID0gQXJyYXkuaXNBcnJheVxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5hdGl2ZUlzQXJyYXkgfHwgaXNBcnJheVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIlxufVxuIiwidmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCJ2dHJlZS92cGF0Y2hcIilcblxudmFyIHJlbmRlciA9IHJlcXVpcmUoXCIuL2NyZWF0ZS1lbGVtZW50XCIpXG52YXIgdXBkYXRlV2lkZ2V0ID0gcmVxdWlyZShcIi4vdXBkYXRlLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UGF0Y2hcblxuZnVuY3Rpb24gYXBwbHlQYXRjaCh2cGF0Y2gsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgdHlwZSA9IHZwYXRjaC50eXBlXG4gICAgdmFyIHZOb2RlID0gdnBhdGNoLnZOb2RlXG4gICAgdmFyIHBhdGNoID0gdnBhdGNoLnBhdGNoXG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSBWUGF0Y2guUkVNT1ZFOlxuICAgICAgICAgICAgcmV0dXJuIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpXG4gICAgICAgIGNhc2UgVlBhdGNoLklOU0VSVDpcbiAgICAgICAgICAgIHJldHVybiBpbnNlcnROb2RlKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WVEVYVDpcbiAgICAgICAgICAgIHJldHVybiBzdHJpbmdQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLldJREdFVDpcbiAgICAgICAgICAgIHJldHVybiB3aWRnZXRQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZOT0RFOlxuICAgICAgICAgICAgcmV0dXJuIHZOb2RlUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5PUkRFUjpcbiAgICAgICAgICAgIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBwYXRjaClcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlBST1BTOlxuICAgICAgICAgICAgYXBwbHlQcm9wZXJ0aWVzKGRvbU5vZGUsIHBhdGNoLCB2Tm9kZS5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guVEhVTks6XG4gICAgICAgICAgICByZXR1cm4gcmVwbGFjZVJvb3QoZG9tTm9kZSxcbiAgICAgICAgICAgICAgICByZW5kZXJPcHRpb25zLnBhdGNoKGRvbU5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKSlcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKSB7XG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHZOb2RlKTtcblxuICAgIHJldHVybiBudWxsXG59XG5cbmZ1bmN0aW9uIGluc2VydE5vZGUocGFyZW50Tm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IHJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobmV3Tm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyZW50Tm9kZVxufVxuXG5mdW5jdGlvbiBzdHJpbmdQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZUZXh0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChkb21Ob2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGRvbU5vZGUucmVwbGFjZURhdGEoMCwgZG9tTm9kZS5sZW5ndGgsIHZUZXh0LnRleHQpXG4gICAgICAgIG5ld05vZGUgPSBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlcih2VGV4dCwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB3aWRnZXQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICBpZiAodXBkYXRlV2lkZ2V0KGxlZnRWTm9kZSwgd2lkZ2V0KSkge1xuICAgICAgICByZXR1cm4gd2lkZ2V0LnVwZGF0ZShsZWZ0Vk5vZGUsIGRvbU5vZGUpIHx8IGRvbU5vZGVcbiAgICB9XG5cbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdXaWRnZXQgPSByZW5kZXIod2lkZ2V0LCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3V2lkZ2V0LCBkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuXG4gICAgcmV0dXJuIG5ld1dpZGdldFxufVxuXG5mdW5jdGlvbiB2Tm9kZVBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyKHZOb2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdykge1xuICAgIGlmICh0eXBlb2Ygdy5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIgJiYgaXNXaWRnZXQodykpIHtcbiAgICAgICAgdy5kZXN0cm95KGRvbU5vZGUpXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgYkluZGV4KSB7XG4gICAgdmFyIGNoaWxkcmVuID0gW11cbiAgICB2YXIgY2hpbGROb2RlcyA9IGRvbU5vZGUuY2hpbGROb2Rlc1xuICAgIHZhciBsZW4gPSBjaGlsZE5vZGVzLmxlbmd0aFxuICAgIHZhciBpXG4gICAgdmFyIHJldmVyc2VJbmRleCA9IGJJbmRleC5yZXZlcnNlXG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChkb21Ob2RlLmNoaWxkTm9kZXNbaV0pXG4gICAgfVxuXG4gICAgdmFyIGluc2VydE9mZnNldCA9IDBcbiAgICB2YXIgbW92ZVxuICAgIHZhciBub2RlXG4gICAgdmFyIGluc2VydE5vZGVcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbW92ZSA9IGJJbmRleFtpXVxuICAgICAgICBpZiAobW92ZSAhPT0gdW5kZWZpbmVkICYmIG1vdmUgIT09IGkpIHtcbiAgICAgICAgICAgIC8vIHRoZSBlbGVtZW50IGN1cnJlbnRseSBhdCB0aGlzIGluZGV4IHdpbGwgYmUgbW92ZWQgbGF0ZXIgc28gaW5jcmVhc2UgdGhlIGluc2VydCBvZmZzZXRcbiAgICAgICAgICAgIGlmIChyZXZlcnNlSW5kZXhbaV0gPiBpKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0KytcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbm9kZSA9IGNoaWxkcmVuW21vdmVdXG4gICAgICAgICAgICBpbnNlcnROb2RlID0gY2hpbGROb2Rlc1tpICsgaW5zZXJ0T2Zmc2V0XSB8fCBudWxsXG4gICAgICAgICAgICBpZiAobm9kZSAhPT0gaW5zZXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgIGRvbU5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGluc2VydE5vZGUpXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIHRoZSBtb3ZlZCBlbGVtZW50IGNhbWUgZnJvbSB0aGUgZnJvbnQgb2YgdGhlIGFycmF5IHNvIHJlZHVjZSB0aGUgaW5zZXJ0IG9mZnNldFxuICAgICAgICAgICAgaWYgKG1vdmUgPCBpKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0T2Zmc2V0LS1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGVsZW1lbnQgYXQgdGhpcyBpbmRleCBpcyBzY2hlZHVsZWQgdG8gYmUgcmVtb3ZlZCBzbyBpbmNyZWFzZSBpbnNlcnQgb2Zmc2V0XG4gICAgICAgIGlmIChpIGluIGJJbmRleC5yZW1vdmVzKSB7XG4gICAgICAgICAgICBpbnNlcnRPZmZzZXQrK1xuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXBsYWNlUm9vdChvbGRSb290LCBuZXdSb290KSB7XG4gICAgaWYgKG9sZFJvb3QgJiYgbmV3Um9vdCAmJiBvbGRSb290ICE9PSBuZXdSb290ICYmIG9sZFJvb3QucGFyZW50Tm9kZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhvbGRSb290KVxuICAgICAgICBvbGRSb290LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1Jvb3QsIG9sZFJvb3QpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld1Jvb3Q7XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG5cbnZhciBkb21JbmRleCA9IHJlcXVpcmUoXCIuL2RvbS1pbmRleFwiKVxudmFyIHBhdGNoT3AgPSByZXF1aXJlKFwiLi9wYXRjaC1vcFwiKVxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuXG5mdW5jdGlvbiBwYXRjaChyb290Tm9kZSwgcGF0Y2hlcykge1xuICAgIHJldHVybiBwYXRjaFJlY3Vyc2l2ZShyb290Tm9kZSwgcGF0Y2hlcylcbn1cblxuZnVuY3Rpb24gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IHBhdGNoSW5kaWNlcyhwYXRjaGVzKVxuXG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBpbmRleCA9IGRvbUluZGV4KHJvb3ROb2RlLCBwYXRjaGVzLmEsIGluZGljZXMpXG4gICAgdmFyIG93bmVyRG9jdW1lbnQgPSByb290Tm9kZS5vd25lckRvY3VtZW50XG5cbiAgICBpZiAoIXJlbmRlck9wdGlvbnMpIHtcbiAgICAgICAgcmVuZGVyT3B0aW9ucyA9IHsgcGF0Y2g6IHBhdGNoUmVjdXJzaXZlIH1cbiAgICAgICAgaWYgKG93bmVyRG9jdW1lbnQgIT09IGRvY3VtZW50KSB7XG4gICAgICAgICAgICByZW5kZXJPcHRpb25zLmRvY3VtZW50ID0gb3duZXJEb2N1bWVudFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlSW5kZXggPSBpbmRpY2VzW2ldXG4gICAgICAgIHJvb3ROb2RlID0gYXBwbHlQYXRjaChyb290Tm9kZSxcbiAgICAgICAgICAgIGluZGV4W25vZGVJbmRleF0sXG4gICAgICAgICAgICBwYXRjaGVzW25vZGVJbmRleF0sXG4gICAgICAgICAgICByZW5kZXJPcHRpb25zKVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHJvb3ROb2RlLCBkb21Ob2RlLCBwYXRjaExpc3QsIHJlbmRlck9wdGlvbnMpIHtcbiAgICBpZiAoIWRvbU5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChpc0FycmF5KHBhdGNoTGlzdCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRjaExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdFtpXSwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3QsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBwYXRjaEluZGljZXMocGF0Y2hlcykge1xuICAgIHZhciBpbmRpY2VzID0gW11cblxuICAgIGZvciAodmFyIGtleSBpbiBwYXRjaGVzKSB7XG4gICAgICAgIGlmIChrZXkgIT09IFwiYVwiKSB7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2goTnVtYmVyKGtleSkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5kaWNlc1xufVxuIiwidmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcInZ0cmVlL2lzLXdpZGdldFwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVwZGF0ZVdpZGdldFxuXG5mdW5jdGlvbiB1cGRhdGVXaWRnZXQoYSwgYikge1xuICAgIGlmIChpc1dpZGdldChhKSAmJiBpc1dpZGdldChiKSkge1xuICAgICAgICBpZiAoXCJuYW1lXCIgaW4gYSAmJiBcIm5hbWVcIiBpbiBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pZCA9PT0gYi5pZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGEuaW5pdCA9PT0gYi5pbml0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2Vcbn1cbiIsInZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4vaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4vaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuL2lzLXdpZGdldFwiKVxudmFyIGlzVGh1bmsgPSByZXF1aXJlKFwiLi9pcy10aHVua1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZVRodW5rXG5cbmZ1bmN0aW9uIGhhbmRsZVRodW5rKGEsIGIpIHtcbiAgICB2YXIgcmVuZGVyZWRBID0gYVxuICAgIHZhciByZW5kZXJlZEIgPSBiXG5cbiAgICBpZiAoaXNUaHVuayhiKSkge1xuICAgICAgICByZW5kZXJlZEIgPSByZW5kZXJUaHVuayhiLCBhKVxuICAgIH1cblxuICAgIGlmIChpc1RodW5rKGEpKSB7XG4gICAgICAgIHJlbmRlcmVkQSA9IHJlbmRlclRodW5rKGEsIG51bGwpXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgYTogcmVuZGVyZWRBLFxuICAgICAgICBiOiByZW5kZXJlZEJcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbmRlclRodW5rKHRodW5rLCBwcmV2aW91cykge1xuICAgIHZhciByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGVcblxuICAgIGlmICghcmVuZGVyZWRUaHVuaykge1xuICAgICAgICByZW5kZXJlZFRodW5rID0gdGh1bmsudm5vZGUgPSB0aHVuay5yZW5kZXIocHJldmlvdXMpXG4gICAgfVxuXG4gICAgaWYgKCEoaXNWTm9kZShyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNWVGV4dChyZW5kZXJlZFRodW5rKSB8fFxuICAgICAgICAgICAgaXNXaWRnZXQocmVuZGVyZWRUaHVuaykpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInRodW5rIGRpZCBub3QgcmV0dXJuIGEgdmFsaWQgbm9kZVwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVuZGVyZWRUaHVua1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc1RodW5rXHJcblxyXG5mdW5jdGlvbiBpc1RodW5rKHQpIHtcclxuICAgIHJldHVybiB0ICYmIHQudHlwZSA9PT0gXCJUaHVua1wiXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSBpc0hvb2tcblxuZnVuY3Rpb24gaXNIb29rKGhvb2spIHtcbiAgICByZXR1cm4gaG9vayAmJiB0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjFcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cblZpcnR1YWxQYXRjaC5OT05FID0gMFxuVmlydHVhbFBhdGNoLlZURVhUID0gMVxuVmlydHVhbFBhdGNoLlZOT0RFID0gMlxuVmlydHVhbFBhdGNoLldJREdFVCA9IDNcblZpcnR1YWxQYXRjaC5QUk9QUyA9IDRcblZpcnR1YWxQYXRjaC5PUkRFUiA9IDVcblZpcnR1YWxQYXRjaC5JTlNFUlQgPSA2XG5WaXJ0dWFsUGF0Y2guUkVNT1ZFID0gN1xuVmlydHVhbFBhdGNoLlRIVU5LID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IFZpcnR1YWxQYXRjaFxuXG5mdW5jdGlvbiBWaXJ0dWFsUGF0Y2godHlwZSwgdk5vZGUsIHBhdGNoKSB7XG4gICAgdGhpcy50eXBlID0gTnVtYmVyKHR5cGUpXG4gICAgdGhpcy52Tm9kZSA9IHZOb2RlXG4gICAgdGhpcy5wYXRjaCA9IHBhdGNoXG59XG5cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxQYXRjaC5wcm90b3R5cGUudHlwZSA9IFwiVmlydHVhbFBhdGNoXCJcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5cbi8vIFRoZSBsaWJyYXJ5IGZvciBnZW5lcmFsIHNpZ25hbCBtYW5pcHVsYXRpb24uIEluY2x1ZGVzIGBsaWZ0YCBmdW5jdGlvblxuLy8gKHRoYXQgc3VwcG9ydHMgdXAgdG8gOCBpbnB1dHMpLCBjb21iaW5hdGlvbnMsIGZpbHRlcnMsIGFuZCBwYXN0LWRlcGVuZGVuY2UuXG4vL1xuLy8gU2lnbmFscyBhcmUgdGltZS12YXJ5aW5nIHZhbHVlcy4gTGlmdGVkIGZ1bmN0aW9ucyBhcmUgcmVldmFsdWF0ZWQgd2hlbnZlclxuLy8gYW55IG9mIHRoZWlyIGlucHV0IHNpZ25hbHMgaGFzIGFuIGV2ZW50LiBTaWduYWwgZXZlbnRzIG1heSBiZSBvZiB0aGUgc2FtZVxuLy8gdmFsdWUgYXMgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBzaWduYWwuIFN1Y2ggc2lnbmFscyBhcmUgdXNlZnVsIGZvclxuLy8gdGltaW5nIGFuZCBwYXN0LWRlcGVuZGVuY2UuXG4vL1xuLy8gU29tZSB1c2VmdWwgZnVuY3Rpb25zIGZvciB3b3JraW5nIHdpdGggdGltZSAoZS5nLiBzZXR0aW5nIEZQUykgYW5kIGNvbWJpbmluZ1xuLy8gc2lnbmFscyBhbmQgdGltZSAoZS5nLiBkZWxheWluZyB1cGRhdGVzLCBnZXR0aW5nIHRpbWVzdGFtcHMpIGNhbiBiZSBmb3VuZCBpblxuLy8gdGhlIFRpbWUgbGlicmFyeS5cbi8vXG4vLyBNb2R1bGUgaW1wbGVtZW50cyBlbG0gQVBJOiBodHRwOi8vZG9jcy5lbG0tbGFuZy5vcmcvbGlicmFyeS9TaWduYWwuZWxtXG5cblxudmFyICRzb3VyY2UgPSBcInNvdXJjZUBzaWduYWxcIlxudmFyICRzb3VyY2VzID0gXCJzb3VyY2VzQHNpZ25hbFwiXG52YXIgJG91dHB1dHMgPSBcIm91dHB1dHNAc2lnbmFsXCJcbnZhciAkY29ubmVjdCA9IFwiY29ubmVjdEBzaWduYWxcIlxudmFyICRkaXNjb25uZWN0ID0gXCJkaXNjb25uZWN0QHNpZ25hbFwiXG52YXIgJHJlY2VpdmUgPSBcInJlY2VpdmVAc2lnbmFsXCJcbnZhciAkZXJyb3IgPSBcImVycm9yQHNpZ25hbFwiXG52YXIgJGVuZCA9IFwiZW5kQHNpZ25hbFwiXG52YXIgJHN0YXJ0ID0gXCJzdGFydEBzaWduYWxcIlxudmFyICRzdG9wID0gXCJzdG9wQHNpZ25hbFwiXG52YXIgJHN0YXRlID0gXCJzdGF0ZUBzaWduYWxcIlxudmFyICRwZW5kaW5nID0gXCJwZW5kaW5nQHNpZ25hbFwiXG5cbmZ1bmN0aW9uIG91dHB1dHMoaW5wdXQpIHsgcmV0dXJuIGlucHV0WyRvdXRwdXRzXSB9XG5vdXRwdXRzLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkb3V0cHV0cyB9XG5leHBvcnRzLm91dHB1dHMgPSBvdXRwdXRzXG5cbmZ1bmN0aW9uIHN0YXJ0KGlucHV0KSB7IGlucHV0WyRzdGFydF0oaW5wdXQpIH1cbnN0YXJ0LnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkc3RhcnQgfVxuZXhwb3J0cy5zdGFydCA9IHN0YXJ0XG5cbmZ1bmN0aW9uIHN0b3AoaW5wdXQpIHsgaW5wdXRbJHN0b3BdKGlucHV0KSB9XG5zdG9wLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7IHJldHVybiAkc3RvcCB9XG5leHBvcnRzLnN0b3AgPSBzdG9wXG5cbmZ1bmN0aW9uIGNvbm5lY3Qoc291cmNlLCB0YXJnZXQpIHsgc291cmNlWyRjb25uZWN0XShzb3VyY2UsIHRhcmdldCkgfVxuY29ubmVjdC50b1N0cmluZyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gJGNvbm5lY3QgfVxuZXhwb3J0cy5jb25uZWN0ID0gY29ubmVjdFxuXG5mdW5jdGlvbiBkaXNjb25uZWN0KHNvdXJjZSwgdGFyZ2V0KSB7IHNvdXJjZVskZGlzY29ubmVjdF0oc291cmNlLCB0YXJnZXQpIH1cbmRpc2Nvbm5lY3QudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRkaXNjb25uZWN0IH1cbmV4cG9ydHMuZGlzY29ubmVjdCA9IGRpc2Nvbm5lY3RcblxuZnVuY3Rpb24gcmVjZWl2ZShpbnB1dCwgbWVzc2FnZSkgeyBpbnB1dFskcmVjZWl2ZV0oaW5wdXQsIG1lc3NhZ2UpIH1cbnJlY2VpdmUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRyZWNlaXZlIH1cbmV4cG9ydHMucmVjZWl2ZSA9IHJlY2VpdmVcblxuZnVuY3Rpb24gZXJyb3IoaW5wdXQsIG1lc3NhZ2UpIHsgaW5wdXRbJGVycm9yXShpbnB1dCwgbWVzc2FnZSkgfVxuZXJyb3IudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRlcnJvciB9XG5leHBvcnRzLmVycm9yID0gZXJyb3JcblxuZnVuY3Rpb24gZW5kKGlucHV0KSB7IGlucHV0WyRlbmRdKGlucHV0KSB9XG5lbmQudG9TdHJpbmcgPSBmdW5jdGlvbigpIHsgcmV0dXJuICRlbmQgfVxuZXhwb3J0cy5lbmQgPSBlbmRcblxuZnVuY3Rpb24gc3RyaW5naWZ5KGlucHV0KSB7XG4gIHJldHVybiBpbnB1dC5uYW1lICsgXCJbXCIgKyAoaW5wdXRbJG91dHB1dHNdIHx8IFtdKS5tYXAoZnVuY3Rpb24oeCkgeyByZXR1cm4geC5uYW1lIH0pICsgXCJdXCJcbn1cblxudmFyIHN0cmluZ2lmaWVyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuZnVuY3Rpb24gaXNFcnJvcihtZXNzYWdlKSB7XG4gIHJldHVybiBzdHJpbmdpZmllci5jYWxsKG1lc3NhZ2UpID09PSBcIltvYmplY3QgRXJyb3JdXCJcbn1cblxuZnVuY3Rpb24gUmV0dXJuKHZhbHVlKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZXR1cm4pKVxuICAgIHJldHVybiBuZXcgUmV0dXJuKHZhbHVlKVxuXG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxufVxuZXhwb3J0cy5SZXR1cm4gPSBSZXR1cm5cblxuZnVuY3Rpb24gc2VuZChpbnB1dCwgbWVzc2FnZSkge1xuICBpZiAobWVzc2FnZSBpbnN0YW5jZW9mIFJldHVybikge1xuICAgIGlucHV0WyRyZWNlaXZlXShpbnB1dCwgbWVzc2FnZS52YWx1ZSlcbiAgICBpbnB1dFskZW5kXShpbnB1dClcbiAgfVxuICBlbHNlIGlmIChpc0Vycm9yKG1lc3NhZ2UpKSB7XG4gICAgaW5wdXRbJGVycm9yXShpbnB1dCwgbWVzc2FnZSlcbiAgfVxuICBlbHNlIHtcbiAgICBpbnB1dFskcmVjZWl2ZV0oaW5wdXQsIG1lc3NhZ2UpXG4gIH1cbn1cbmV4cG9ydHMuc2VuZCA9IHNlbmRcblxuZnVuY3Rpb24gQnJlYWsoKSB7fVxuZXhwb3J0cy5CcmVhayA9IEJyZWFrXG5cblxuZnVuY3Rpb24gSW5wdXQoc291cmNlKSB7XG4gIHRoaXNbJHNvdXJjZV0gPSBzb3VyY2U7XG4gIHRoaXNbJG91dHB1dHNdID0gW107XG59XG5leHBvcnRzLklucHV0ID0gSW5wdXRcblxuXG4vLyBgSW5wdXQuc3RhcnRgIGlzIGludm9rZWQgd2l0aCBhbiBgaW5wdXRgIHdoZW5ldmVyIHN5c3RlbSBpc1xuLy8gcmVhZHkgdG8gc3RhcnQgcmVjZWl2aW5nIHZhbHVlcy4gQWZ0ZXIgdGhpcyBwb2ludCBgaW5wdXRgIGNhblxuLy8gc3RhcnQgc2VuZGluZyBtZXNzYWdlcy4gR2VuZXJpYyBiZWhhdmlvciBpcyB0byBgY29ubmVjdGAgdG9cbi8vIHRoZSBgaW5wdXRbJHNvdXJjZV1gIHRvIHN0YXJ0IHJlY2VpdmluZyBtZXNzYWdlcy5cbklucHV0LnN0YXJ0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZSA9IGlucHV0WyRzb3VyY2VdXG4gIGlmIChzb3VyY2UpIHtcbiAgICBzb3VyY2VbJGNvbm5lY3RdKHNvdXJjZSwgaW5wdXQpXG4gIH1cbn1cblxuLy8gYElucHV0LnN0b3BgIGlzIGludm9rZWQgd2l0aCBhbiBgaW5wdXRgIHdoZW5ldmVyIGl0IG5lZWRzIHRvXG4vLyBzdG9wLiBBZnRlciB0aGlzIHBvaW50IGBpbnB1dGAgc2hvdWxkIHN0b3Agc2VuZGluZyBtZXNzYWdlcy5cbi8vIEdlbmVyaWMgYElucHV0YCBiZWhhdmlvciBpcyB0byBgZGlzY29ubmVjdGAgZnJvbSB0aGVcbi8vIGBpbnB1dFskc291cmNlXWAgc28gbm8gbW9yZSBgbWVzc2FnZXNgIHdpbGwgYmUgcmVjZWl2ZWQuXG5JbnB1dC5zdG9wID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZSA9IGlucHV0WyRzb3VyY2VdXG4gIHNvdXJjZVskZGlzY29ubmVjdF0oc291cmNlLCBpbnB1dClcbn1cblxuLy8gYElucHV0LmNvbm5lY3RgIGlzIGludm9rZWQgd2l0aCBgaW5wdXRgIGFuZCBgb3V0cHV0YC4gVGhpc1xuLy8gaW1wbGVtZW50YXRpb24gcHV0J3MgYG91dHB1dGAgdG8gaXQncyBgJG91dHB1dGAgcG9ydHMgdG9cbi8vIGRlbGVnYXRlIHJlY2VpdmVkIGBtZXNzYWdlc2AgdG8gaXQuXG5JbnB1dC5jb25uZWN0ID0gZnVuY3Rpb24oaW5wdXQsIG91dHB1dCkge1xuICB2YXIgb3V0cHV0cyA9IGlucHV0WyRvdXRwdXRzXVxuICBpZiAob3V0cHV0cy5pbmRleE9mKG91dHB1dCkgPCAwKSB7XG4gICAgb3V0cHV0cy5wdXNoKG91dHB1dClcbiAgICBpZiAob3V0cHV0cy5sZW5ndGggPT09IDEpXG4gICAgICBpbnB1dFskc3RhcnRdKGlucHV0KVxuICB9XG59XG5cbi8vIGBJbnB1dC5kaXNjb25uZWN0YCBpcyBpbnZva2VkIHdpdGggYGlucHV0YCBhbmQgYW4gYG91dHB1dGBcbi8vIGNvbm5lY3RlZCB0byBpdC4gQWZ0ZXIgdGhpcyBwb2ludCBgb3V0cHV0YCBzaG91bGQgbm90IGxvbmdlclxuLy8gcmVjZWl2ZSBtZXNzYWdlcyBmcm9tIHRoZSBgaW5wdXRgLiBJZiBpdCdzIGEgbGFzdCBgb3V0cHV0YFxuLy8gYGlucHV0YCB3aWxsIGJlIHN0b3BwZWQuXG5JbnB1dC5kaXNjb25uZWN0ID0gZnVuY3Rpb24oaW5wdXQsIG91dHB1dCkge1xuICB2YXIgb3V0cHV0cyA9IGlucHV0WyRvdXRwdXRzXVxuICB2YXIgaW5kZXggPSBvdXRwdXRzLmluZGV4T2Yob3V0cHV0KVxuICBpZiAoaW5kZXggPj0gMCkge1xuICAgIG91dHB1dHMuc3BsaWNlKGluZGV4LCAxKVxuICAgIGlmIChvdXRwdXRzLmxlbmd0aCA9PT0gMClcbiAgICAgIGlucHV0WyRzdG9wXShpbnB1dClcbiAgfVxufVxuXG4vLyBgSW5wdXQuUG9ydGAgY3JlYXRlcyBhIG1lc3NhZ2UgcmVjZWl2ZXIgcG9ydC4gYElucHV0YCBpbnN0YW5jZXMgc3VwcG9ydFxuLy8gYG1lc3NhZ2VgLCBgZXJyb3JgLCBgZW5kYCBwb3J0cy5cbklucHV0LlBvcnQgPSBmdW5jdGlvbihwb3J0KSB7XG4gIHZhciBpc0Vycm9yID0gcG9ydCA9PT0gJGVycm9yXG4gIHZhciBpc0VuZCA9IHBvcnQgPT09ICRlbmRcbiAgdmFyIGlzTWVzc2FnZSA9IHBvcnQgPT09ICRyZWNlaXZlXG5cbiAgLy8gRnVuY3Rpb24gd2lsbCB3cml0ZSBgbWVzc2FnZWAgdG8gYSBnaXZlbiBgaW5wdXRgLiBUaGlzIG1lYW5zXG4gIC8vIGl0IHdpbGwgZGVsZWdlYXRlIG1lc3NhZ2VzIHRvIGl0J3MgYGlucHV0WyRvdXRwdXRzXWAgcG9ydHMuXG4gIHJldHVybiBmdW5jdGlvbiB3cml0ZShpbnB1dCwgbWVzc2FnZSkge1xuICAgIHZhciBvdXRwdXRzID0gaW5wdXRbJG91dHB1dHNdXG4gICAgdmFyIHJlc3VsdCA9IHZvaWQoMClcbiAgICB2YXIgY291bnQgPSBvdXRwdXRzLmxlbmd0aFxuICAgIHZhciBpbmRleCA9IDBcblxuICAgIC8vIE5vdGU6IGRpc3BhdGNoIGxvb3AgZGVjcmVhc2VzIGNvdW50IG9yIGluY3JlYXNlcyBpbmRleCBhcyBuZWVkZWQuXG4gICAgLy8gVGhpcyBtYWtlcyBzdXJlIHRoYXQgbmV3IGNvbm5lY3Rpb25zIHdpbGwgbm90IHJlY2VpdmUgbWVzc2FnZXNcbiAgICAvLyB1bnRpbCBuZXh0IGRpc3BhdGNoIGxvb3AgJiBpbnRlbnRpb25hbGx5IHNvLlxuICAgIHdoaWxlIChpbmRleCA8IG91dHB1dHMubGVuZ3RoKSB7XG4gICAgICAvLyBBdHRlbXB0IHRvIHNlbmQgYSB2YWx1ZSB0byBhIGNvbm5lY3RlZCBgb3V0cHV0YC4gSWYgdGhpcyBpc1xuICAgICAgLy8gYCRlbmRgIGBwb3J0YCByZXR1cm4gYEJyZWFrYCB0byBjYXVzZSBgb3V0cHV0YCB0byBiZVxuICAgICAgLy8gZGlzY29ubmVjdGVkLiBJZiBhbnkgb3RoZXIgYHBvcnRgIGp1c3QgZGVsaXZlciBhIGBtZXNzYWdlYC5cbiAgICAgIHZhciBvdXRwdXQgPSBvdXRwdXRzW2luZGV4XVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gaXNFbmQgPyBvdXRwdXRbcG9ydF0ob3V0cHV0LCBpbnB1dCkgOlxuICAgICAgICAgICAgICAgICBvdXRwdXRbcG9ydF0ob3V0cHV0LCBtZXNzYWdlLCBpbnB1dClcbiAgICAgIH1cbiAgICAgIGNhdGNoIChyZWFzb24pIHtcbiAgICAgICAgdGhyb3cgcmVhc29uXG4gICAgICAgIC8vIElmIGV4Y2VwdGlvbiB3YXMgdGhyb3duIGFuZCBgbWVzc2FnZWAgd2FzIHNlbmQgdG8gYCRlcnJvcmBcbiAgICAgICAgLy8gYHBvcnRgIGdpdmUgdXAgYW5kIGxvZyBlcnJvci5cbiAgICAgICAgaWYgKGlzRXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlY2VpdmUgYW4gZXJyb3IgbWVzc2FnZVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbilcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBleGNlcHRpb24gd2FzIHRocm93biB3aGVuIHdyaXRpbmcgdG8gYSBkaWZmZXJlbnQgYHBvcnRgXG4gICAgICAgIC8vIGF0dGVtcHQgdG8gd3JpdGUgdG8gYW4gYCRlcnJvcmAgYHBvcnRgIG9mIHRoZSBgb3V0cHV0YC5cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG91dHB1dFskZXJyb3JdKG91dHB1dCwgcmVhc29uLCBpbnB1dClcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgZXhjZXB0aW9uIGlzIHN0aWxsIHRocm93biB3aGVuIHdyaXRpbmcgdG8gYW4gYCRlcnJvcmBcbiAgICAgICAgICAvLyBgcG9ydGAgZ2l2ZSB1cCBhbmQgbG9nIGBlcnJvcmAuXG4gICAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiRmFpbGVkIHRvIHJlY2VpdmUgbWVzc2FnZSAmIGFuIGVycm9yXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBJZiByZXN1bHQgb2Ygc2VuZGluZyBgbWVzc2FnZWAgdG8gYW4gYG91dHB1dGAgd2FzIGluc3RhbmNlXG4gICAgICAvLyBvZiBgQnJlYWtgLCBkaXNjb25uZWN0IHRoYXQgYG91dHB1dGAgc28gaXQgbm8gbG9uZ2VyIGdldCdzXG4gICAgICAvLyBtZXNzYWdlcy4gTm90ZSBgaW5kZXhgIGlzIGRlY3JlbWVudGVkIGFzIGRpc2Nvbm5lY3Qgd2lsbFxuICAgICAgLy8gcmVtb3ZlIGl0IGZyb20gYG91dHB1dHNgLlxuICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEJyZWFrIHx8IGlzRW5kKSB7XG4gICAgICAgIGlucHV0WyRkaXNjb25uZWN0XShpbnB1dCwgb3V0cHV0KVxuICAgICAgfVxuICAgICAgLy8gT24gYW55IG90aGVyIGByZXN1bHRgIGp1c3QgbW92ZSB0byBhIG5leHQgb3V0cHV0LlxuICAgICAgZWxzZSB7XG4gICAgICAgIGluZGV4ID0gaW5kZXggKyAxXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT25jZSBtZXNzYWdlIHdhcyB3cml0dGVuIHRvIGFsbCBvdXRwdXRzIHVwZGF0ZSBgdmFsdWVgIG9mXG4gICAgLy8gdGhlIGlucHV0LlxuICAgIGlmIChpc01lc3NhZ2UpXG4gICAgICBpbnB1dC52YWx1ZSA9IG1lc3NhZ2VcblxuICAgIGlmIChjb3VudCA9PT0gMCAmJiBpc0VuZClcbiAgICAgIGlucHV0WyRzdG9wXShpbnB1dClcbiAgfVxufVxuXG4vLyBJbnB1dHMgaGF2ZSBgbWVzc2FnZWAsIGBlcnJvcmAgYW5kIGBlbmRgIHBvcnRzXG5JbnB1dC5yZWNlaXZlID0gSW5wdXQuUG9ydCgkcmVjZWl2ZSlcbklucHV0LmVycm9yID0gSW5wdXQuUG9ydCgkZXJyb3IpXG5JbnB1dC5lbmQgPSBJbnB1dC5Qb3J0KCRlbmQpXG5cbi8vIFNhbWUgQVBJIGZ1bmN0aW9ucyBhcmUgc2F2ZWQgaW4gdGhlIHByb3RvdHlwZSBpbiBvcmRlciB0byBlbmFibGVcbi8vIHBvbHltb3JwaGljIGRpc3BhdGNoLlxuSW5wdXQucHJvdG90eXBlWyRzdGFydF0gPSBJbnB1dC5zdGFydFxuSW5wdXQucHJvdG90eXBlWyRzdG9wXSA9IElucHV0LnN0b3BcbklucHV0LnByb3RvdHlwZVskY29ubmVjdF0gPSBJbnB1dC5jb25uZWN0XG5JbnB1dC5wcm90b3R5cGVbJGRpc2Nvbm5lY3RdID0gSW5wdXQuZGlzY29ubmVjdFxuSW5wdXQucHJvdG90eXBlWyRyZWNlaXZlXSA9IElucHV0LnJlY2VpdmVcbklucHV0LnByb3RvdHlwZVskZXJyb3JdID0gSW5wdXQuZXJyb3JcbklucHV0LnByb3RvdHlwZVskZW5kXSA9IElucHV0LmVuZFxuSW5wdXQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4geyB2YWx1ZTogdGhpcy52YWx1ZSB9XG59XG5cbmZ1bmN0aW9uIENvbnN0YW50KHZhbHVlKSB7XG4gIHRoaXMudmFsdWUgPSB2YWx1ZVxufVxuQ29uc3RhbnQuaWdub3JlID0gZnVuY3Rpb24oKSB7fVxuXG5Db25zdGFudC5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuQ29uc3RhbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29uc3RhbnRcbkNvbnN0YW50LnByb3RvdHlwZVskc3RhcnRdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJHN0b3BdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGNvbm5lY3RdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGRpc2Nvbm5lY3RdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJHJlY2VpdmVdID0gQ29uc3RhbnQuaWdub3JlXG5Db25zdGFudC5wcm90b3R5cGVbJGVycm9yXSA9IENvbnN0YW50Lmlnbm9yZVxuQ29uc3RhbnQucHJvdG90eXBlWyRlbmRdID0gQ29uc3RhbnQuaWdub3JlXG5cblxuLy8gQ3JlYXRlIGEgY29uc3RhbnQgc2lnbmFsIHRoYXQgbmV2ZXIgY2hhbmdlcy5cblxuLy8gYSAtPiBTaWduYWwgYVxuXG5mdW5jdGlvbiBjb25zdGFudCh2YWx1ZSkge1xuICByZXR1cm4gbmV3IENvbnN0YW50KHZhbHVlKVxufVxuZXhwb3J0cy5jb25zdGFudCA9IGNvbnN0YW50XG5cblxuZnVuY3Rpb24gTWVyZ2UoaW5wdXRzKSB7XG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlc10gPSBpbnB1dHNcbiAgdGhpc1skcGVuZGluZ10gPSBpbnB1dHMubGVuZ3RoXG4gIHRoaXMudmFsdWUgPSBpbnB1dHNbMF0udmFsdWVcbn1cbk1lcmdlLnN0YXJ0ID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNvdXJjZXMgPSBpbnB1dFskc291cmNlc11cbiAgdmFyIGNvdW50ID0gc291cmNlcy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuXG4gIHdoaWxlIChpZCA8IGNvdW50KSB7XG4gICAgdmFyIHNvdXJjZSA9IHNvdXJjZXNbaWRdXG4gICAgc291cmNlWyRjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbn1cbk1lcmdlLnN0b3AgPSBmdW5jdGlvbihpbnB1dCkge1xuICB2YXIgaW5wdXRzID0gaW5wdXRbJHNvdXJjZXNdXG4gIHZhciBjb3VudCA9IGlucHV0cy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuICB3aGlsZSAoaWQgPCBjb3VudCkge1xuICAgIHZhciBzb3VyY2UgPSBpbnB1dHNbaWRdXG4gICAgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbn1cbk1lcmdlLmVuZCA9IGZ1bmN0aW9uKGlucHV0LCBzb3VyY2UpIHtcbiAgdmFyIHNvdXJjZXMgPSBpbnB1dFskc291cmNlc11cbiAgdmFyIGlkID0gc291cmNlcy5pbmRleE9mKHNvdXJjZSlcbiAgaWYgKGlkID49IDApIHtcbiAgICB2YXIgcGVuZGluZyA9IGlucHV0WyRwZW5kaW5nXSAtIDFcbiAgICBpbnB1dFskcGVuZGluZ10gPSBwZW5kaW5nXG4gICAgc291cmNlWyRkaXNjb25uZWN0XShzb3VyY2UsIGlucHV0KVxuXG4gICAgaWYgKHBlbmRpbmcgPT09IDApXG4gICAgICBJbnB1dC5lbmQoaW5wdXQpXG4gIH1cbn1cblxuTWVyZ2UucHJvdG90eXBlID0gbmV3IElucHV0KClcbk1lcmdlLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1lcmdlXG5NZXJnZS5wcm90b3R5cGVbJHN0YXJ0XSA9IE1lcmdlLnN0YXJ0XG5NZXJnZS5wcm90b3R5cGVbJHN0b3BdID0gTWVyZ2Uuc3RvcFxuTWVyZ2UucHJvdG90eXBlWyRlbmRdID0gTWVyZ2UuZW5kXG5cbi8vIE1lcmdlIHR3byBzaWduYWxzIGludG8gb25lLCBiaWFzZWQgdG93YXJkcyB0aGVcbi8vIGZpcnN0IHNpZ25hbCBpZiBib3RoIHNpZ25hbHMgdXBkYXRlIGF0IHRoZSBzYW1lIHRpbWUuXG5cbi8vIFNpZ25hbCB4IC0+IFNpZ25hbCB5IC0+IC4uLiAtPiBTaWduYWwgelxuZnVuY3Rpb24gbWVyZ2UoKSB7XG4gIHJldHVybiBuZXcgTWVyZ2Uoc2xpY2VyLmNhbGwoYXJndW1lbnRzLCAwKSlcbn1cbmV4cG9ydHMubWVyZ2UgPSBtZXJnZVxuXG5cbi8vIE1lcmdlIG1hbnkgc2lnbmFscyBpbnRvIG9uZSwgYmlhc2VkIHRvd2FyZHMgdGhlXG4vLyBsZWZ0LW1vc3Qgc2lnbmFsIGlmIG11bHRpcGxlIHNpZ25hbHMgdXBkYXRlIHNpbXVsdGFuZW91c2x5LlxuZnVuY3Rpb24gbWVyZ2VzKGlucHV0cykge1xuICByZXR1cm4gbmV3IE1lcmdlKGlucHV0cylcbn1cbmV4cG9ydHMubWVyZ2VzID0gbWVyZ2VzXG5cblxuLy8gIyBQYXN0LURlcGVuZGVuY2VcblxuLy8gQ3JlYXRlIGEgcGFzdC1kZXBlbmRlbnQgc2lnbmFsLiBFYWNoIHZhbHVlIGdpdmVuIG9uIHRoZSBpbnB1dCBzaWduYWxcbi8vIHdpbGwgYmUgYWNjdW11bGF0ZWQsIHByb2R1Y2luZyBhIG5ldyBvdXRwdXQgdmFsdWUuXG5cbmZ1bmN0aW9uIEZvbGRQKHN0ZXAsIHZhbHVlLCBpbnB1dCkge1xuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXNbJHNvdXJjZV0gPSBpbnB1dFxuICB0aGlzLnZhbHVlID0gdmFsdWVcbiAgdGhpcy5zdGVwID0gc3RlcFxufVxuRm9sZFAucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlLCBzb3VyY2UpIHtcbiAgSW5wdXQucmVjZWl2ZShpbnB1dCwgaW5wdXQuc3RlcChpbnB1dC52YWx1ZSwgbWVzc2FnZSkpXG59XG5cbkZvbGRQLnByb3RvdHlwZSA9IG5ldyBJbnB1dCgpXG5Gb2xkUC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGb2xkUFxuRm9sZFAucHJvdG90eXBlWyRyZWNlaXZlXSA9IEZvbGRQLnJlY2VpdmVcblxuXG5mdW5jdGlvbiBmb2xkcChzdGVwLCB4LCB4cykge1xuICByZXR1cm4gbmV3IEZvbGRQKHN0ZXAsIHgsIHhzKVxufVxuZXhwb3J0cy5mb2xkcCA9IGZvbGRwXG5cblxuLy8gT3B0aW1pemVkIHZlcnNpb24gdGhhdCB0cmFja3Mgc2luZ2xlIGlucHV0LlxuZnVuY3Rpb24gTGlmdChzdGVwLCBpbnB1dCkge1xuICB0aGlzLnN0ZXAgPSBzdGVwXG4gIHRoaXNbJHNvdXJjZV0gPSBpbnB1dFxuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXMudmFsdWUgPSBzdGVwKGlucHV0LnZhbHVlKVxufVxuTGlmdC5yZWNlaXZlID0gZnVuY3Rpb24oaW5wdXQsIG1lc3NhZ2UpIHtcbiAgSW5wdXQucmVjZWl2ZShpbnB1dCwgaW5wdXQuc3RlcChtZXNzYWdlKSlcbn1cblxuTGlmdC5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuTGlmdC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBMaWZ0XG5MaWZ0LnByb3RvdHlwZVskcmVjZWl2ZV0gPSBMaWZ0LnJlY2VpdmVcblxuZnVuY3Rpb24gTGlmdE4oc3RlcCwgaW5wdXRzKSB7XG4gIHZhciBjb3VudCA9IGlucHV0cy5sZW5ndGhcbiAgdmFyIGlkID0gMFxuICB2YXIgcGFyYW1zID0gQXJyYXkoY291bnQpXG4gIHdoaWxlIChpZCA8IGNvdW50KSB7XG4gICAgdmFyIGlucHV0ID0gaW5wdXRzW2lkXVxuICAgIHBhcmFtc1tpZF0gPSBpbnB1dC52YWx1ZVxuICAgIGlkID0gaWQgKyAxXG4gIH1cbiAgdmFyIHZhbHVlID0gc3RlcC5hcHBseShzdGVwLCBwYXJhbXMpXG5cbiAgdGhpcy5zdGVwID0gc3RlcFxuICB0aGlzWyRvdXRwdXRzXSA9IFtdXG4gIHRoaXNbJHNvdXJjZXNdID0gaW5wdXRzXG4gIHRoaXNbJHBlbmRpbmddID0gaW5wdXRzLmxlbmd0aFxuICB0aGlzWyRzdGF0ZV0gPSBwYXJhbXNcbiAgdGhpcy52YWx1ZSA9IHZhbHVlXG59XG5MaWZ0Ti5zdGFydCA9IE1lcmdlLnN0YXJ0XG5MaWZ0Ti5zdG9wID0gTWVyZ2Uuc3RvcFxuTGlmdE4uZW5kID0gTWVyZ2UuZW5kXG5cblxuTGlmdE4ucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlLCBzb3VyY2UpIHtcbiAgdmFyIHBhcmFtcyA9IGlucHV0WyRzdGF0ZV1cbiAgdmFyIGluZGV4ID0gaW5wdXRbJHNvdXJjZXNdLmluZGV4T2Yoc291cmNlKVxuICB2YXIgc3RlcCA9IGlucHV0LnN0ZXBcbiAgcGFyYW1zW2luZGV4XSA9IG1lc3NhZ2VcbiAgcmV0dXJuIElucHV0LnJlY2VpdmUoaW5wdXQsIHN0ZXAuYXBwbHkoc3RlcCwgcGFyYW1zKSlcbn1cblxuTGlmdE4ucHJvdG90eXBlID0gbmV3IElucHV0KClcbkxpZnROLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IExpZnROXG5MaWZ0Ti5wcm90b3R5cGVbJHN0YXJ0XSA9IExpZnROLnN0YXJ0XG5MaWZ0Ti5wcm90b3R5cGVbJHN0b3BdID0gTGlmdE4uc3RvcFxuTGlmdE4ucHJvdG90eXBlWyRlbmRdID0gTGlmdE4uZW5kXG5MaWZ0Ti5wcm90b3R5cGVbJHJlY2VpdmVdID0gTGlmdE4ucmVjZWl2ZVxuXG52YXIgc2xpY2VyID0gW10uc2xpY2VcblxuLy8gVHJhbnNmb3JtIGdpdmVuIHNpZ25hbChzKSB3aXRoIGEgZ2l2ZW4gYHN0ZXBgIGZ1bmN0aW9uLlxuXG4vLyAoeCAtPiB5IC0+IC4uLikgLT4gU2lnbmFsIHggLT4gU2lnbmFsIHkgLT4gLi4uIC0+IFNpZ25hbCB6XG4vL1xuLy8geHMgICAgICAgICAgICAgIDotLXgtLS0tLXgtLS0tLXgtLS1cbi8vIGxpZnQoZiwgeHMpICAgICA6LS1mKHgpLS1mKHgpLS1mKHgpXG4vL1xuLy8geHMgICAgICAgICAgICAgIDotLXgtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXgtLS0tLS0tXG4vLyB5cyAgICAgICAgICAgICAgOi0tLS0tLS0tLS0teS0tLS0tLS0tLXktLS0tLS0tLS0tLS0tLS1cbi8vIGxpZnQoZiwgeHMsIHlzKSA6LS1mKHgsIHkpLS1mKHgsIHkpLS1mKHgsIHkpLS1mKHgsIHkpLVxuZnVuY3Rpb24gbGlmdChzdGVwLCB4cywgeXMpIHtcbiAgcmV0dXJuIHlzID8gbmV3IExpZnROKHN0ZXAsIHNsaWNlci5jYWxsKGFyZ3VtZW50cywgMSkpIDpcbiAgICAgICAgIG5ldyBMaWZ0KHN0ZXAsIHhzKVxufVxuZXhwb3J0cy5saWZ0ID0gbGlmdFxuZXhwb3J0cy5saWZ0MiA9IGxpZnRcbmV4cG9ydHMubGlmdDMgPSBsaWZ0XG5leHBvcnRzLmxpZnQ0ID0gbGlmdFxuZXhwb3J0cy5saWZ0NSA9IGxpZnRcbmV4cG9ydHMubGlmdDYgPSBsaWZ0XG5leHBvcnRzLmxpZnQ3ID0gbGlmdFxuZXhwb3J0cy5saWZ0OCA9IGxpZnRcbmV4cG9ydHMubGlmdE4gPSBsaWZ0XG5cblxuLy8gQ29tYmluZSBhIGFycmF5IG9mIHNpZ25hbHMgaW50byBhIHNpZ25hbCBvZiBhcnJheXMuXG5mdW5jdGlvbiBjb21iaW5lKGlucHV0cykge1xuICByZXR1cm4gbmV3IExpZnROKEFycmF5LCBpbnB1dHMpXG59XG5leHBvcnRzLmNvbWJpbmUgPSBjb21iaW5lXG5cblxuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIGV2ZW50cyB0aGF0IGhhdmUgb2NjdXJlZC5cblxuLy8gU2lnbmFsIHggLT4gU2lnbmFsIEludFxuLy9cbi8vIHhzICAgICAgIDogIC0teC0teC0tLS14LS14LS0tLS0teFxuLy8gY291bnQoeHMpOiAgLS0xLS0yLS0tLTMtLTQtLS0tLS01XG5mdW5jdGlvbiBjb3VudCh4cykge1xuICByZXR1cm4gZm9sZHAoZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiB4ICsgMVxuICB9LCAwLCB4cylcbn1cbmV4cG9ydHMuY291bnQgPSBjb3VudFxuXG4vLyBDb3VudCB0aGUgbnVtYmVyIG9mIGV2ZW50cyB0aGF0IGhhdmUgb2NjdXJlZCB0aGF0XG4vLyBzYXRpc2Z5IGEgZ2l2ZW4gcHJlZGljYXRlLlxuXG4vLyAoeCAtPiBCb29sKSAtPiBTaWduYWwgeCAtPiBTaWduYWwgSW50XG5mdW5jdGlvbiBjb3VudElmKHAsIHhzKSB7XG4gIHJldHVybiBjb3VudChrZWVwSWYocCwgeHMudmFsdWUsIHhzKSlcbn1cbmV4cG9ydHMuY291bnRJZiA9IGNvdW50SWZcblxuLy8gIyBGaWx0ZXJzXG5cbmZ1bmN0aW9uIEtlZXBJZihwLCB2YWx1ZSwgaW5wdXQpIHtcbiAgdGhpcy5wID0gcFxuICB0aGlzLnZhbHVlID0gcChpbnB1dC52YWx1ZSkgPyBpbnB1dC52YWx1ZSA6IHZhbHVlXG4gIHRoaXNbJG91dHB1dHNdID0gW11cbiAgdGhpc1skc291cmNlXSA9IGlucHV0XG59XG5LZWVwSWYucmVjZWl2ZSA9IGZ1bmN0aW9uKGlucHV0LCBtZXNzYWdlKSB7XG4gIGlmIChpbnB1dC5wKG1lc3NhZ2UpKVxuICAgIElucHV0LnJlY2VpdmUoaW5wdXQsIG1lc3NhZ2UpXG59XG5LZWVwSWYucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gS2VlcElmXG5LZWVwSWYucHJvdG90eXBlID0gbmV3IElucHV0KClcbktlZXBJZi5wcm90b3R5cGVbJHJlY2VpdmVdID0gS2VlcElmLnJlY2VpdmVcblxuLy8gS2VlcCBvbmx5IGV2ZW50cyB0aGF0IHNhdGlzZnkgdGhlIGdpdmVuIHByZWRpY2F0ZS5cbi8vIEVsbSBkb2VzIG5vdCBhbGxvdyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlIGNhc2Vcbi8vIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZSB0aGUgcHJlZGljYXRlIGlzIG5ldmVyIHNhdGlzZmllZC5cblxuLy8gKHggLT4gQm9vbCkgLT4geCAtPiBTaWduYWwgeCAtPiBTaWduYWwgeFxuZnVuY3Rpb24ga2VlcElmKHAsIHgsIHhzKSB7XG4gIHJldHVybiBuZXcgS2VlcElmKHAsIHgsIHhzKVxufVxuZXhwb3J0cy5rZWVwSWYgPSBrZWVwSWZcblxuXG5mdW5jdGlvbiBEcm9wSWYocCwgdmFsdWUsIGlucHV0KSB7XG4gIHRoaXMucCA9IHBcbiAgdGhpcy52YWx1ZSA9IHAoaW5wdXQudmFsdWUpID8gdmFsdWUgOiBpbnB1dC52YWx1ZVxuICB0aGlzWyRzb3VyY2VdID0gaW5wdXRcbiAgdGhpc1skb3V0cHV0c10gPSBbXVxufVxuRHJvcElmLnJlY2VpdmUgPSBmdW5jdGlvbihpbnB1dCwgbWVzc2FnZSkge1xuICBpZiAoIWlucHV0LnAobWVzc2FnZSkpXG4gICAgSW5wdXQucmVjZWl2ZShpbnB1dCwgbWVzc2FnZSlcbn1cbkRyb3BJZi5wcm90b3R5cGUgPSBuZXcgSW5wdXQoKVxuRHJvcElmLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IERyb3BJZlxuRHJvcElmLnByb3RvdHlwZVskcmVjZWl2ZV0gPSBEcm9wSWYucmVjZWl2ZVxuXG4vLyBEcm9wIGV2ZW50cyB0aGF0IHNhdGlzZnkgdGhlIGdpdmVuIHByZWRpY2F0ZS4gRWxtIGRvZXMgbm90IGFsbG93XG4vLyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlIGNhc2UgbXVzdCBiZSBwcm92aWRlZCBpbiBjYXNlIHRoZVxuLy8gcHJlZGljYXRlIGlzIG5ldmVyIHNhdGlzZmllZC5cblxuLy8gKHggLT4gQm9vbCkgLT4geCAtPiBTaWduYWwgeCAtPiBTaWduYWwgeFxuZnVuY3Rpb24gZHJvcElmKHAsIHgsIHhzKSB7XG4gIHJldHVybiBuZXcgRHJvcElmKHAsIHgsIHhzKVxufVxuZXhwb3J0cy5kcm9wSWYgPSBkcm9wSWZcblxuXG4vLyBLZWVwIGV2ZW50cyBvbmx5IHdoZW4gdGhlIGZpcnN0IHNpZ25hbCBpcyB0cnVlLiBXaGVuIHRoZSBmaXJzdCBzaWduYWxcbi8vIGJlY29tZXMgdHJ1ZSwgdGhlIG1vc3QgcmVjZW50IHZhbHVlIG9mIHRoZSBzZWNvbmQgc2lnbmFsIHdpbGwgYmUgcHJvcGFnYXRlZC5cbi8vIFVudGlsIHRoZSBmaXJzdCBzaWduYWwgYmVjb21lcyBmYWxzZSBhZ2FpbiwgYWxsIGV2ZW50cyB3aWxsIGJlIHByb3BhZ2F0ZWQuXG4vLyBFbG0gZG9lcyBub3QgYWxsb3cgdW5kZWZpbmVkIHNpZ25hbHMsIHNvIGEgYmFzZSBjYXNlIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZVxuLy8gdGhlIGZpcnN0IHNpZ25hbCBpcyBuZXZlciB0cnVlLlxuXG4vLyBTaWduYWwgQm9vbCAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBTa2lwKCkgeyByZXR1cm4gU2tpcCB9XG5mdW5jdGlvbiBpc1NraXAoeCkgeyByZXR1cm4geCA9PT0gU2tpcCB9XG5mdW5jdGlvbiBza2lwSWZUcnVlKGlzVHJ1ZSwgeCkgeyByZXR1cm4gaXNUcnVlID8gU2tpcCA6IHggfVxuZnVuY3Rpb24gc2tpcElmRmFsc2UoaXNUcnVlLCB4KSB7IHJldHVybiBpc1RydWUgPyB4IDogU2tpcCB9XG5cbmZ1bmN0aW9uIGtlZXBXaGVuKHN0YXRlLCB4LCB4cykge1xuICB2YXIgaW5wdXQgPSBsaWZ0KHNraXBJZkZhbHNlLCBkcm9wUmVwZWF0cyhzdGF0ZSksIHhzKVxuICByZXR1cm4gZHJvcElmKGlzU2tpcCwgeCwgaW5wdXQpXG59XG5leHBvcnRzLmtlZXBXaGVuID0ga2VlcFdoZW5cblxuLy8gRHJvcCBldmVudHMgd2hlbiB0aGUgZmlyc3Qgc2lnbmFsIGlzIHRydWUuIFdoZW4gdGhlIGZpcnN0IHNpZ25hbFxuLy8gYmVjb21lcyBmYWxzZSwgdGhlIG1vc3QgcmVjZW50IHZhbHVlIG9mIHRoZSBzZWNvbmQgc2lnbmFsIHdpbGwgYmVcbi8vIHByb3BhZ2F0ZWQuIFVudGlsIHRoZSBmaXJzdCBzaWduYWwgYmVjb21lcyB0cnVlIGFnYWluLCBhbGwgZXZlbnRzXG4vLyB3aWxsIGJlIHByb3BhZ2F0ZWQuIEVsbSBkb2VzIG5vdCBhbGxvdyB1bmRlZmluZWQgc2lnbmFscywgc28gYSBiYXNlXG4vLyBjYXNlIG11c3QgYmUgcHJvdmlkZWQgaW4gY2FzZSB0aGUgZmlyc3Qgc2lnbmFsIGlzIGFsd2F5cyB0cnVlLlxuXG4vLyBTaWduYWwgQm9vbCAtPiB4IC0+IFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBkcm9wV2hlbihzdGF0ZSwgeCwgeHMpIHtcbiAgdmFyIGlucHV0ID0gbGlmdChza2lwSWZUcnVlLCBkcm9wUmVwZWF0cyhzdGF0ZSksIHhzKVxuICByZXR1cm4gZHJvcElmKGlzU2tpcCwgeCwgaW5wdXQpXG59XG5leHBvcnRzLmRyb3BXaGVuID0gZHJvcFdoZW5cblxuLy8gRHJvcCBzZXF1ZW50aWFsIHJlcGVhdGVkIHZhbHVlcy4gRm9yIGV4YW1wbGUsIGlmIGEgc2lnbmFsIHByb2R1Y2VzXG4vLyB0aGUgc2VxdWVuY2UgWzEsMSwyLDIsMV0sIGl0IGJlY29tZXMgWzEsMiwxXSBieSBkcm9wcGluZyB0aGUgdmFsdWVzXG4vLyB0aGF0IGFyZSB0aGUgc2FtZSBhcyB0aGUgcHJldmlvdXMgdmFsdWUuXG5cbi8vIFNpZ25hbCB4IC0+IFNpZ25hbCB4XG5mdW5jdGlvbiBkcm9wUmVwZWF0cyh4cykge1xuICByZXR1cm4gZHJvcElmKGZ1bmN0aW9uKHgpIHtcbiAgICByZXR1cm4geHMudmFsdWUgPT09IHhcbiAgfSwgeHMudmFsdWUsIHhzKVxufVxuZXhwb3J0cy5kcm9wUmVwZWF0cyA9IGRyb3BSZXBlYXRzXG5cbi8vIFNhbXBsZSBmcm9tIHRoZSBzZWNvbmQgaW5wdXQgZXZlcnkgdGltZSBhbiBldmVudCBvY2N1cnMgb24gdGhlIGZpcnN0XG4vLyBpbnB1dC4gRm9yIGV4YW1wbGUsIChzYW1wbGVPbiBjbGlja3MgKGV2ZXJ5IHNlY29uZCkpIHdpbGwgZ2l2ZSB0aGVcbi8vIGFwcHJveGltYXRlIHRpbWUgb2YgdGhlIGxhdGVzdCBjbGljay5cblxuLy8gU2lnbmFsIGEgLT4gU2lnbmFsIGIgLT4gU2lnbmFsIGJcbmZ1bmN0aW9uIHNhbXBsZU9uKHRpY2tzLCBpbnB1dCkge1xuICByZXR1cm4gbWVyZ2UoZHJvcElmKFRydWUsIGlucHV0LnZhbHVlLCBpbnB1dCksXG4gICAgICAgICAgICAgICBsaWZ0KGZ1bmN0aW9uKF8pIHsgcmV0dXJuIGlucHV0LnZhbHVlIH0sIHRpY2tzKSlcbn1cbmV4cG9ydHMuc2FtcGxlT24gPSBzYW1wbGVPblxuXG5mdW5jdGlvbiBUcnVlKCkgeyByZXR1cm4gdHJ1ZSB9XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHJ1biA9IHJlcXVpcmUoXCJyZWZsZXgvYXBwL3J1bm5lclwiKS5ydW5cbnZhciBBcHBXb3JrZXIgPSByZXF1aXJlKFwicmVmbGV4L2FwcC93b3JrZXJcIikuQXBwV29ya2VyXG5cbnJ1bihuZXcgQXBwV29ya2VyKFwiLi9hcHAtYnVuZGxlLmpzXCIpLCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFwcFwiKSlcbiIsbnVsbF19
;