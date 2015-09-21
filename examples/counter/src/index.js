import {Application} from "reflex"
import {Renderer} from "reflex-react-renderer"
import * as Counter from "./counter"


var init = window.app ? window.app.model.value : {value: 0}
var app = new Application({
  initialize: () => Counter.Model(init),
  update: Counter.update,
  view: Counter.view
})
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.send)
