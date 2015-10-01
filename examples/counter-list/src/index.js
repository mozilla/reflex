/* @flow */

import * as CounterList from "./list"
import {start} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: [CounterList.create(window.app != null
                                ?
                                  window.app.model.value
                                :
                                  {
                                    nextID: 0,
                                    entries: []
                                  })],
  update: CounterList.update,
  view: CounterList.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
