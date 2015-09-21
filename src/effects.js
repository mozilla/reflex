/* @flow */

import * as Task from "./task"

export class Never {}

/*::
export type Effects <a> = Task.Task<Never, a>;
*/

export var none = Task.succeed(void(0))

export var concurrent = (...fx) => Task.io(deliver => {
  var count = fx.length
  var index = 0
  while (index < count) {
    Task.perform(fx[index])
    index = index + 1
  }

  deliver(succeed)
})

export var sequential = (...fx) => Task.io(deliver => {
  var pending = fx.length
  var next = () => {
    if (--pending >= 0) {
      Task.run(fx[pending], next)
    }
  }

  next()

  deliver(succeed)
})


export var requestAnimationFrame = f => Task.io(deliver => {
  var id = requestAnimationFrame(function(time) {
    Task.perform(f(time))
  })
  deliver(Task.succeed(id))
})

export var nofx = update => (model, action) =>
  [update(model, action), none];
