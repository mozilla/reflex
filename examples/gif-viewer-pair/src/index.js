/* @flow */

import * as Pair from "./pair"
import {start, Effects} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: window.app != null ?
           [Pair.create(window.app.model.value)] :
           Pair.initialize("funny cats", "funny hamsters"),
  step: Pair.step,
  view: Pair.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
app.task.subscribe(Effects.service(app.address))
