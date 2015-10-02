/* @flow */

import * as RandomGif from "./random-gif"
import {start, Task, Effects} from "reflex"
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
app.task.subscribe(Task.service(app.address))
// app.task.subscribe(task => {
//   console.log(task)
//   if (task && task != Effects.none) {
//     Task.perform(Task.onSuccess(task, action => {
//                   console.log(action)
//                   return Task.send(app.address, action)
//                 }))
//   }
// })
