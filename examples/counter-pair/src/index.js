/* @flow */

import * as Pair from "./pair"
import {start} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: [Pair.create(window.app != null ?
                            window.app.model.value :
                            {
                              top: {value: 0},
                              bottom: {value: 0}
                            })],
  update: Pair.update,
  view: Pair.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
