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

