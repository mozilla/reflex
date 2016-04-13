/* @flow */

import {Task} from "./task"

/*::
import type {Never} from "./effects"
import type {Address} from "./signal"
*/

const raise =
  error => {
    throw Error(`Effects should be created from task that never fail but it did fail with error ${error}`)
  }

const ignore =
  _ =>
  void(0)

const nil =
  Task.succeed(void(0))

const never =
  new Task((succeed, fail) => void(0))

export class Effects /*::<a>*/ {
  static task /*::<a>*/(task/*:Task<Never, a>*/)/*:Effects<a>*/ {
    return new Effects(task)
  }
  static tick /*::<a>*/(tag/*:(time:Time) => a*/)/*:Effects<a>*/ {
    return new Tick(tag)
  }
  static receive /*::<a>*/(action/*:a*/)/*:Effects<a>*/ {
    const fx =
      new Effects
      ( new Task
        ( (succeed, fail) =>
          void
          ( Promise
            .resolve(action)
            .then(succeed, fail)
          )
        )
      )
    return fx
  }
  static batch /*::<a>*/(effects/*:Array<Effects<a>>*/)/*:Effects<a>*/ {
    return new Batch(effects)
  }
  static driver /*::<a>*/(address/*:Address<a>*/)/*:(fx:Effects<a>) => void*/ {
    return fx => {
      if (!(fx instanceof None)) {
        Task.fork(fx.send(address), ignore, raise)
      }
    }
  }
  /*::
  static none:Effects<any>;
  task: Task<Never, a>;
  */
  constructor(task/*:Task<Never, a>*/) {
    this.task = task
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Effects(this.task.map(f))
  }
  send(address/*:Address<a>*/)/*:Task<Never, void>*/ {
    return this.task.chain(value => Task.send(address, value))
  }
}

class None /*::<a>*/ extends Effects /*::<any>*/ {
  constructor() {
    super(never)
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return Effects.none
  }
  send(address/*:Address<a>*/)/*:Task<Never, void>*/ {
    return nil
  }
}
Effects.none = new None()

class Batch /*::<a>*/ extends Effects /*::<a>*/ {
  /*::
  effects: Array<Effects<a>>;
  */
  constructor(effects/*:Array<Effects<a>>*/) {
    super(never)
    this.effects = effects
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Batch(this.effects.map(effect => effect.map(f)))
  }
  send(address/*:Address<a>*/)/*:Task<Never, void>*/ {
    return new Task((succeed, fail) => {
      const {effects} = this
      const count = effects.length
      let index = 0
      while (index < count) {
        const effect = effects[index]
        if (!(effect instanceof None)) {
          Task.fork(effect.send(address), ignore, raise)
        }

        index = index + 1
      }
      succeed(void(0))
    })
  }
}


class Tick /*::<a>*/ extends Effects /*::<a>*/ {
  /*::
  tag: (time:Time) => a;
  */
  constructor(tag/*:(time:Time) => a*/) {
    super(never)
    this.tag = tag
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Tick((time/*:Time*/) => f(this.tag(time)))
  }
  send(address/*:Address<a>*/)/*:Task<Never, void>*/ {
    const task =
      new Task
      ( (succeed, fail) =>
        animationScheduler.schedule(time => succeed(this.tag(time)))
      )
      .chain(action => Task.send(address, action))
    return task
  }
}

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
