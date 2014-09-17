var commonEvents = [
  "blur", "change", "click", "contextmenu", "dblclick",
  "error","focus", "focusin", "focusout", "input", "keydown",
  "keypress", "keyup", "load", "mousedown", "mouseup",
  "resize", "scroll", "select", "submit", "touchcancel",
  "touchend", "touchstart", "unload"]


function findEventNode(node) {
}

function serialize(event) {
  var target = findEventNodeFor(event);
  var path = target.getAttribute("data-reflex-path")
  return {
    nodePath: path,
    type: event.type
  }
}

function listen(root, handler) {
  function listener(event) {
    var message = serialize(event)
    handler(message)
    return false
  }

  commonEvents.forEach(function(type) {
    root.addEventListener(type, handler, false)
  })
}
exports.listen = listen
