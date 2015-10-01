/* @flow */

import * as Counter from "./counter"
import {start} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: [Counter.create(window.app != null ?
                            window.app.model.value :
                            {value: 0})],
  update: Counter.update,
  view: Counter.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
