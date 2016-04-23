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
    console.warn('Effects.task is deprecated please use Effects.perform instead')
    return new Perform(task)
  }
  static perform /*::<a>*/(task/*:Task<Never, a>*/)/*:Effects<a>*/ {
    return new Perform(task)
  }
  static tick /*::<a>*/(tag/*:(time:number) => a*/)/*:Effects<a>*/ {
    console.warn('Effects.tick is deprecated please use Effects.perform(Task.requestAnimationFrame.map(tag)) instead')
    return new Perform(Task.requestAnimationFrame().map(tag))
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
  map: <b> (f:(a:a)=>b) => Effects<b>;
  send: (address:Address<a>) => Task<Never, void>;
  */
}

class Perform /*::<a>*/ extends Effects /*::<a>*/ {
  constructor(task/*:Task<Never, a>*/) {
    super()
    this.task = task
  }
  map /*::<b>*/ (f/*:(a:a)=>b*/)/*:Effects<b>*/ {
    return new Perform(this.task.map(f))
  }
}

class None /*::<a>*/ extends Effects /*::<any>*/ {
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
    super()
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
