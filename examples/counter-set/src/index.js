/* @flow */

import * as CounterSet from "./set"
import {start} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: CounterSet.create(window.app != null ?
                                window.app.model.value :
                                {nextID: 0, entries: []}),
  update: CounterSet.update,
  view: CounterSet.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
