/* @flow */

import * as Task from "./task"

export class Never {}

/*::
export type Effects <a> = Task.Task<Never, a>;
*/

export const none = Task.succeed(void(0))

export const concurrent = /*::<a>*/(...fx/*:Array<Effects<a>>*/)/*:Effects<void>*/ =>
  Task.io(deliver => {
    var count = fx.length
    var index = 0
    while (index < count) {
      Task.perform(fx[index])
      index = index + 1
    }

    deliver(Task.succeed(void(0)))
  })

export const sequential = /*::<a>*/(...fx/*:Array<Effects<a>>*/)/*:Effects<void>*/ =>
  Task.io(deliver => {
    var pending = fx.length
    var next = () => {
      if (--pending >= 0) {
        Task.execute(fx[pending], next)
      }
    }

    next()

    deliver(Task.succeed(void(0)))
  })


/*::
type ThreadID = number;
type Time = number;
*/
export const requestAnimationFrame = (f/*:(time:Time)=>Effects<any>*/)/*:Effects<ThreadID>*/=>
  Task.io(deliver => {
    var id = global.requestAnimationFrame((time/*:Time*/)/*:void*/ => {
      Task.perform(f(time))
    })

    deliver(Task.succeed(id))
  })

/*::
export type None <action> = Effects<action>;
export type Update <Model, Action> = (m:Model, a:Action) => [Model, None];
*/
export const nofx = /*::<Model, Action>*/(update/*:(m:Model, a:Action)=>Model*/)/*:Update<Model, Action>*/ =>
  (model/*:Model*/, action/*:Action*/)/*:[Model, None]*/ =>
    [update(model, action), none];
