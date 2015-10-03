/* @flow */

import * as RandomGif from "./random-gif"
import {start, Effects} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: window.app != null ?
           [RandomGif.create(window.app.model.value)] :
           RandomGif.initialize("funny cats"),
  step: RandomGif.step,
  view: RandomGif.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
app.task.subscribe(Effects.service(app.address))
