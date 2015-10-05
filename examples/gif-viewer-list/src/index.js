/* @flow */

import * as RandemGifList from "./list"
import {start, Effects} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: window.app != null ?
           [RandemGifList.create(window.app.model.value)] :
           RandemGifList.initialize(),
  step: RandemGifList.step,
  view: RandemGifList.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
app.task.subscribe(Effects.service(app.address))
