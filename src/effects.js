/* @noflow */

import {succeed, perform, send, io, future} from "./task"
/*::
import type {Task} from "./task"
*/



/*::
import type {Address} from "./signal"
import type {Effects} from "./effects"
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
  map/*::<a,b>*/(f/*:(a:a)=>b*/)/*:Effects<any>*/ {
    return none
  }
  send(address/*:Address<any>*/) /*:Task<Never,void>*/ {
    return succeed()
  }
}
None.prototype.$type = "Effects.None"

export const none/*:Effects<any>*/ = new None()


// Invariants:
// 1. In the NO_REQUEST state, there is never a scheduled animation frame.
// 2. In the PENDING_REQUEST and EXTRA_REQUEST states, there is always exactly
// one scheduled animation frame.
const NO_REQUEST = 0
const PENDING_REQUEST = 1
const EXTRA_REQUEST = 2


/*::
type Time = number
type State = 0 | 1 | 2
*/

class AnimationScheduler {
  /*::
  state: State;
  requests: Array<(time:Time) => any>;
  execute: (time:Time) => void;
  */
  constructor() {
    this.state = NO_REQUEST
    this.requests = []
    this.execute = this.execute.bind(this)
  }
  schedule(request) {
    if (this.state === NO_REQUEST) {
      window.requestAnimationFrame(this.execute)
    }

    this.requests.push(request)
    this.state = PENDING_REQUEST
  }
  execute(time/*:Time*/)/*:void*/ {
    switch (this.state) {
      case NO_REQUEST:
        // This state should not be possible. How can there be no
        // request, yet somehow we are actively fulfilling a
        // request?
        throw Error(`Unexpected frame request`)
      case PENDING_REQUEST:
        // At this point, we do not *know* that another frame is
        // needed, but we make an extra frame request just in
        // case. It's possible to drop a frame if frame is requested
        // too late, so we just do it preemptively.
        window.requestAnimationFrame(this.execute)
        this.state = EXTRA_REQUEST
        this.dispatch(this.requests.splice(0), 0, time)
        break
      case EXTRA_REQUEST:
        // Turns out the extra request was not needed, so we will
        // stop requesting. No reason to call it all the time if
        // no one needs it.
        this.state = NO_REQUEST
        break
    }
  }
  dispatch(requests, index, time) {
    const count = requests.length
    try {
      while (index < count) {
        const request = requests[index]
        index = index + 1
        request(time)
      }
    } finally {
      if (index < count) {
        this.dispatch(requests, index, time)
      }
    }
  }
}

const animationScheduler = new AnimationScheduler()

class Tick /*::<a>*/ {
  /*::
  $type: "Effects.Tick";
  tag: (time:Time) => a;
  */
  constructor(tag/*:(time:Time) => a*/) {
    this.tag = tag
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Tick((time/*:Time*/) => f(this.tag(time)))
  }
  send(address/*:Address<a>*/)/*:Task<Never,void>*/ {
    const task = io(deliver => animationScheduler.schedule(time => deliver(succeed(time))))
                  .map(this.tag)
                  .chain((response/*:a*/) => send(address, response))
    perform(task)
    return succeed()
  }
}
Tick.prototype.$type = "Effects.Tick"

class Job /*::<a>*/ {
  /*::
  $type: "Effects.Task";
  task: Task<Never,a>;
  */
  constructor(task/*:Task<Never,a>*/) {
    this.task = task
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Task(this.task.map(f))
  }
  send(address/*:Address<a>*/)/*:Task<Never,void>*/ {
    const task = this
                    .task
                    .chain(response => send(address, response))
    perform(task)
    return succeed()
  }
}
Task.prototype.$type = "Effects.Task"

class Batch /*::<a>*/ {
  /*::
  $type: "Effects.Batch";
  effects: Array<Effects<a>>;
  */
  constructor(effects/*:Array<Effects<a>>*/) {
    this.effects = effects
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Batch(this.effects.map(effect => effect.map(f)))
  }
  send(address/*:Address<any>*/)/*:Task<Never,void>*/{
    const {effects} = this
    const count = effects.length
    let index = 0
    while (index < count) {
      effects[index].send(address)
      index = index + 1
    }
    return succeed()
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
export const task = /*::<a>*/
  (task/*:Task<Never, a>*/)/*:Effects<a>*/ =>
  new Job(task)

// Request a clock tick for animations. This function takes a function to turn
// the current time into an `a` value that can be handled by the relevant
// component.
export const tick = /*::<a>*/
  (tag/*:(time:number) => a*/)/*:Effects<a>*/ =>
  new Tick(tag)

export const receive = /*::<a>*/
  (action/*:a*/)/*:Effects<a>*/ =>
  new Task(io(deliver => Promise.resolve(a).then(deliver)))

// Create a batch of effects. The following example requests two tasks: one
// for the user’s picture and one for their age. You could put a bunch more
// stuff in that batch if you wanted!
//
//  const init = (userID) => [
//    {id: userID, picture: null, age: null},
//    batch([getPicture(userID), getAge(userID)])
//  ]
//
export const batch = /*::<a>*/
  (effects/*:Array<Effects<a>>*/)/*:Effects<a>*/ =>
  new Batch(effects)


export const nofx = /*::<model, action>*/
  (model/*:model*/)/*:[model, Effects<a>]*/ =>
  [model, none]


export const service = /*::<action>*/
  (address/*:Address<action>*/)/*:(fx:Effects<a>) => void*/ =>
  (fx/*:Effects<a>*/)/*:void*/ =>
  void(perform(fx.send(address)))
