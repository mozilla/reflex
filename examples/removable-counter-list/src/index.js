/* @flow */

import * as RemovableCounterList from "./removable-list"
import {start} from "reflex"
import {Renderer} from "reflex-react-renderer"

var app = start({
  initial: [RemovableCounterList.create(window.app != null
                                ?
                                  window.app.model.value
                                :
                                  {
                                    nextID: 0,
                                    entries: []
                                  })],
  update: RemovableCounterList.update,
  view: RemovableCounterList.view
});
window.app = app

var renderer = new Renderer({target: document.body})

app.view.subscribe(renderer.address)
