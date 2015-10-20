/* @flow */

import * as TaskModule from "./task"

const {succeed, perform, send, io, future, Task: TaskType} = TaskModule

/*::
import type {Address} from "../type/signal"
import * as type from "../type/effects"
*/

// A type that is "uninhabited". There are no values of type `Never`, so if
// something has this type, it is a guarantee that it can never happen. It is
// useful for demanding that a `Task` can never fail.
export class Never {
  /*::
  $type: "Effects.Never";
  */
}
Never.prototype.$type = "Effects.Never"

// The simplest effect of them all: don’t do anything! This is useful when
// some branches of your update function request effects and others do not.
export class None {
  /*::
  $type: "Effects.None";
  */
  map/*::<a,b>*/(f/*:(a:a)=>b*/)/*:None*/ {
    return none
  }
  send(address/*:Address<any>*/) /*:TaskType<Never,void>*/ {
    return succeed()
  }
}
None.prototype.$type = "Effects.None"

export const none = new None()

/*::
type Time = number
*/

class Tick /*::<a>*/ {
  /*::
  $type: "Effects.Tick";
  tag: (time:Time) => a;
  */
  static request(deliver) {
    window.requestAnimationFrame(time => deliver(succeed(time)))
  }
  constructor(tag/*:(time:Time) => a*/) {
    this.tag = tag
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Tick<b>*/ {
    return new Tick((time/*:Time*/) => f(this.tag(time)))
  }
  send(address/*:Address<a>*/)/*:TaskType<Never,void>*/ {
    return io(Tick.request)
              .map(this.tag)
              .chain((response/*:a*/) => send(address, response))
  }
}
Tick.prototype.$type = "Effects.Tick"

class Task /*::<a>*/ {
  /*::
  $type: "Effects.Task";
  task: TaskType<Never,a>;
  */
  constructor(task/*:TaskType<Never,a>*/) {
    this.task = task
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Task<b>*/ {
    return new Task(this.task.map(f))
  }
  send(address/*:Address<a>*/)/*:TaskType<Never,void>*/ {
    return this.task
               .chain(response => send(address, response))
  }
}
Task.prototype.$type = "Effects.Task"

class Batch /*::<a>*/ {
  /*::
  $type: "Effects.Batch";
  effects: Array<type.Effects<a>>;
  */
  constructor(effects/*:Array<type.Effects<a>>*/) {
    this.effects = effects
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Batch<b>*/ {
    return new Batch(this.effects.map(effect => effect.map(f)))
  }
  send(address/*:Address<any>*/)/*:TaskType<Never,void>*/{
    return this.effects.reduce((task, effect) => {
      return task.chain(_ => effect.send(address))
    }, succeed())
  }
}
Batch.prototype.$type = "Effects.Batch"

// export const map = /*::<a,b>*/(effects/*:Effects<a>*/, f/*:(a:a)=>b*/)/*:Effects<b>*/ =>
//   effects.map(f)

// Normally a `Task` has a error type and a success type. In this case the error
// type is `Never` meaning that you must provide a task that never fails. Lots of
// tasks can fail (like HTTP requests), so you will want to use `Task.toMaybe`
// and `Task.toResult` to move potential errors into the success type so they
// can be handled explicitly.
export const task/*:type.task*/ = task => new Task(task)

// Request a clock tick for animations. This function takes a function to turn
// the current time into an `a` value that can be handled by the relevant
// component.
export const tick/*:type.tick*/ = tag => new Tick(tag)

// Create a batch of effects. The following example requests two tasks: one
// for the user’s picture and one for their age. You could put a bunch more
// stuff in that batch if you wanted!
//
//  const init = (userID) => [
//    {id: userID, picture: null, age: null},
//    batch([getPicture(userID), getAge(userID)])
//  ]
//
export const batch/*:type.batch*/ = effects => new Batch(effects)


export const nofx/*:type.nofx*/ = update => (model, action) =>
  [update(model, action), none];


export const service/*:type.service*/ = address => fx =>
  void(perform(fx.send(address)))
