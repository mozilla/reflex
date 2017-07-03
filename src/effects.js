/* @flow */

import { Task } from "./task"

import type { Address } from "./signal"

export type Time = number

const raise = error => {
  throw Error(
    `Effects should be created from task that empty fail but it did fail with error ${error}`
  )
}

const ignore = _ => void 0

const nil = Task.succeed(void 0)

const empty = new Task((succeed, fail) => void 0)

export class Effects<a> {
  static task<a>(task: Task<empty, a>): Effects<a> {
    console.warn(
      "Effects.task is deprecated please use Effects.perform instead"
    )
    return new Perform(task)
  }
  static perform<a>(task: Task<empty, a>): Effects<a> {
    return new Perform(task)
  }
  static tick<a>(tag: (time: number) => a): Effects<a> {
    console.warn(
      "Effects.tick is deprecated please use Effects.perform(Task.requestAnimationFrame().map(tag)) instead"
    )
    return new Perform(Task.requestAnimationFrame().map(tag))
  }
  static receive<a>(action: a): Effects<a> {
    const fx = new Perform(
      new Task(
        (succeed, fail) => void Promise.resolve(action).then(succeed, fail)
      )
    )
    return fx
  }
  static batch<a>(effects: Array<Effects<a>>): Effects<a> {
    return new Batch(effects)
  }
  map<b>(f: (a: a) => b): Effects<b> {
    throw Error("Subclass of abstract Effect must implement map")
  }
  execute(address: Address<a>): Task<empty, void> {
    throw Error("Subclass of abstract Effect must implement execute")
  }
  static none: Effects<any>
  task: Task<empty, a>
}

class Perform<a> extends Effects<a> {
  constructor(task: Task<empty, a>) {
    super()
    this.task = task
  }
  map<b>(f: (a: a) => b): Effects<b> {
    return new Perform(this.task.map(f))
  }
  execute(address: Address<a>): Task<empty, void> {
    return this.task.chain(value => Task.send(address, value))
  }
}

class None<a> extends Effects<any> {
  map<b>(f: (a: a) => b): Effects<b> {
    return Effects.none
  }
  execute(address: Address<a>): Task<empty, void> {
    return nil
  }
}
Effects.none = new None()

class Batch<a> extends Effects<a> {
  constructor(effects: Array<Effects<a>>) {
    super()
    this.effects = effects
  }
  map<b>(f: (a: a) => b): Effects<b> {
    return new Batch(this.effects.map(effect => effect.map(f)))
  }
  execute(address: Address<a>): Task<empty, void> {
    return new Task((succeed, fail) => {
      const { effects } = this
      const count = effects.length
      let index = 0
      while (index < count) {
        const effect = effects[index]
        if (!(effect instanceof None)) {
          Task.fork(effect.execute(address), ignore, raise)
        }

        index = index + 1
      }
      succeed(void 0)
    })
  }

  effects: Array<Effects<a>>
}
