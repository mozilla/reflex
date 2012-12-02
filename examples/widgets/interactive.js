"use strict";

var CodeMirror = require("./code-mirror")
var diff = require("diffpatcher/diff")
var patch = require("diffpatcher/patch")
var render = require("./render")


CodeMirror.defaults.interactiveEnabled = true
CodeMirror.defaults.interactiveKey = "Cmd-Enter"
CodeMirror.defaults.interactiveSpeed = 300
CodeMirror.defaults.interactiveSeparator = /^\/\/ \=\>[^\n]*$/m

var makeView = (function() {
  var uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAMCAYAAABBV8wuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGpJREFUeNpi/P//PwM2wMSAA7CACEYggLKZgfgvEP8BCYAwKxALAjEPEH8B4g9MUI5IWlqayevXr9eCaCBfGGSSVnJysu/Xr1+fAx3y/9u3by9BfIb29vZCmCAMgCQZ/+NwL07nUlECIMAAMr41sxvv6oEAAAAASUVORK5CYII="
  var template = document.createElement("div")

  template.style.marginLeft = "-10px"
  template.style.padding = "0"
  template.style.position = "relative"
  template.style.marginRight = "-10px"
  template.style.whiteSpace = "normal"

  template.innerHTML = [
    "  <div class='cm-live-output-border-top'> </div>",
    "  <div class='cm-live-output-box'>",
    "    <h1 class='cm-live-output-head'>Out[0]</h1>",
    "    <pre class='cm-live-output-body'>Hello output</pre>",
    "  </div>",
    "  <div class='cm-live-output-border-bottom'></div>",
  ].join("\n")

    template.querySelector(".cm-live-output-border-top").setAttribute("style", [
    "position: relative",
    "z-index: 2",
    "height: 12px",
    "background-clip: padding-box",
    "background: url('" + uri + "') top right repeat-x"
  ].join(";"))

  template.querySelector(".cm-live-output-border-bottom").setAttribute("style", [
    "position: relative",
    "z-index: 2",
    "height: 12px",
    "background-clip: padding-box",
    "background: url('" + uri + "') top left repeat-x",
    "-webkit-transform: rotate(180deg)",
    "transform: rotate(180deg)"
  ].join(";"))

  template.querySelector(".cm-live-output-box").setAttribute("style", [
    "-moz-box-shadow: 0 0 30px -2px #000",
    "-webkit-box-shadow: 0 0 30px -2px #000",
    "box-shadow: 0 0 30px -2px #000",
    "color: black",
    "background: white",
    "position: relative",
    "padding: 10px",
    "margin: 0px",
    "display: -webkit-box",
    "display: -moz-box",
    "display: -moz-flex;",
    "-webkit-box-flex: 2",
    "-moz-box-flex: 2",
    "box-flex: 2",
    "width: 100%"
  ].join(";"))

  template.querySelector(".cm-live-output-head").setAttribute("style", [
    "-webkit-box-flex: 0",
    "-moz-box-flex: 0",
    "box-flex: 0",
    "margin: 0 10px 0 0",
    "whitespace: pre",
    "color: white",
    "text-shadow: 0px 1px 5px #000"
  ].join(";"))
  template.querySelector(".cm-live-output-body").setAttribute("style", [
    "-webkit-box-flex: 1",
    "-moz-box-flex: 1",
    "box-flex: 1",
    "padding-right: 30px"
  ].join(";"))

  return function makeView(editor, line) {
    var view = template.cloneNode(true)

    editor.markText({ line: line, ch: 0 },
                    { line: line + 1, ch: 0 },
                    { atomic: true, replacedWith: view })

    return view
  }
})()

module.exports = function interactive(editor) {
  var state = {}
  var View = {}
  var Out = {}
  var id = -1

  window.Out = Out

  function apply(delta) {
    Object.keys(delta).forEach(function(id) {
      var In = delta[id]
      editor.operation(function() {
        if (In === null) {
          delete Out[id]
          delete View[id]
        } else {
          var view = View[id] || (View[id] = makeView(editor, In.line))
          try {
            Out[id] = window.eval(In.source)
          } catch (error) {
            Out[id] = error
          }
          var label = view.querySelector(".cm-live-output-head")
          var code = view.querySelector(".cm-live-output-body")
          label.textContent = "Out[" + id + "] = "
          code.innerHTML = "<span></span>"
          var out = render(Out[id])
          if (out instanceof Element)
            code.replaceChild(out, code.children[0])
          else
            code.textContent = out
        }
      })
    })
    state = patch(state, delta)
  }

  function calculate() {
    var source = editor.getValue()
    var separator = editor.getOption("interactiveSeparator")
    var sections = source.split(separator)
    sections.pop()
    var update = Object.keys(sections).reduce(function(result, index) {
      var source = sections[index]
      var out = result.out + source.split("\n").length - 1
      result.out = out
      result.state[index] = {
        source: source,
        line: out
      }

      return result
    }, { out: 0, state: {} })

    var delta = diff(state, update.state)
    apply(delta)
  }

  editor.on("change", function(editor, change) {
    clearTimeout(id)
    id = setTimeout(calculate, editor.getOption("interactiveSpeed"), change)
  })

  function print(editor) {
    if (!editor.getOption("interactiveEnabled")) throw CodeMirror.Pass
    editor.operation(function() {
      var cursor = editor.getCursor()
      editor.replaceSelection("\n// =>\n")
      editor.setCursor({ line: cursor.line + 2, ch: 0 })
    })
  }

  CodeMirror.keyMap.default[editor.getOption("interactiveKey")] = print
}
