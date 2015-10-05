/* @flow */

import * as SpinSquarePair from "./spin-square-pair"
import {start, Effects} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: window.app != null ?
           [SpinSquarePair.create(window.app.model.value)] :
           SpinSquarePair.initialize(),
  step: SpinSquarePair.step,
  view: SpinSquarePair.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
app.task.subscribe(Effects.service(app.address))
