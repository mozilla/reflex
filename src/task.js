/* @flow */

import type { Address } from "./signal"
import {
  requestAnimationFrame,
  cancelAnimationFrame
} from "./preemptive-animation-frame"

export type ThreadID = number
export type Time = number
export type ProcessID = number

const raise = error => {
  throw Error(
    `Task was not supposet to never fail but it did fail with error ${error}`
  )
}

const ignore = _ => void 0

export interface Process<error, value, message, reason> {
  id: ProcessID,
  isActive: boolean,
  kill(reson: reason): void
}

export class Task<x, a> {
  static create<x, a>(
    execute: (succeed: (a: a) => void, fail: (x: x) => void) => void
  ): Task<x, a> {
    console.warn("Task.create is deprecated API use new Task instead")
    return new Task(execute)
  }
  static future<x, a>(request: () => Promise<a>): Task<x, a> {
    console.warn("Task.future is deprecated API use new Task instead")
    return new Future(request)
  }
  static succeed<x, a>(value: a): Task<x, a> {
    return new Succeed(value)
  }

  static fail<x, a>(error: x): Task<x, a> {
    return new Fail(error)
  }

  static spawn<x, y, a>(task: Task<x, a>): Task<y, ThreadID> {
    return new Spawn(task)
  }

  static sleep<x>(time: Time): Task<x, void> {
    return new Sleep(time)
  }

  static requestAnimationFrame<x>(): Task<x, Time> {
    return new AnimationFrame()
  }

  static send<x, a>(address: Address<a>, message: a): Task<x, void> {
    return new Send(address, message)
  }

  static fork<x, a, message, reason>(
    task: Task<x, a>,
    onSucceed: (a: a) => void,
    onFail: (x: x) => void
  ): Process<x, a, message, reason> {
    return Thread.fork(task, onSucceed, onFail)
  }

  static perform(task: Task<empty, void>): void {
    Thread.fork(task, ignore, raise)
  }

  constructor<handle>(
    execute: ?(succeed: (a: a) => void, fail: (x: x) => void) => handle,
    cancel: ?(handle: handle) => void
  ) {
    this.type = "Task"
    const task = (this: any)
    if (execute != null) {
      task.fork = execute
    }
    if (cancel != null) {
      task.abort = cancel
    }
  }
  chain<b>(next: (a: a) => Task<x, b>): Task<x, b> {
    return new Chain(this, next)
  }
  map<b>(f: (input: a) => b): Task<x, b> {
    return new Map(this, f)
  }
  capture<y>(handle: (error: x) => Task<y, a>): Task<y, a> {
    return new Capture(this, handle)
  }
  format<y>(f: (input: x) => y): Task<y, a> {
    return new Format(this, f)
  }
  recover<y>(regain: (error: x) => a): Task<y, a> {
    return new Recover(this, regain)
  }
  fork(succeed: (a: a) => void, fail: (x: x) => void): * {
    return this.execute(succeed, fail)
  }
  abort(token: *): void {
    return this.cancel(token)
  }

  type: *
  execute: (succeed: (a: a) => void, fail: (x: x) => void) => *
  cancel: (handle: *) => void
}

class Succeed<x, a> extends Task<x, a> {
  constructor(value: a) {
    super()
    this.type = "Succeed"
    this.value = value
  }
  fork(succeed: (a: a) => void, fail: (x: x) => void): void {
    succeed(this.value)
  }

  type: "Succeed"
  value: a
}

class Fail<x, a> extends Task<x, a> {
  constructor(error: x) {
    super()
    this.type = "Fail"
    this.error = error
  }
  fork(succeed: (a: a) => void, fail: (x: x) => void): void {
    fail(this.error)
  }

  type: "Fail"
  error: x
}

class Sleep<x, a: void> extends Task<x, void> {
  constructor(time: Time) {
    super()
    this.time = time
  }
  fork(succeed: (a: a) => void, fail: (x: x) => void): number {
    return setTimeout(succeed, this.time, void 0)
  }
  abort(id: number): void {
    clearTimeout(id)
  }

  time: Time
}

class AnimationFrame<x> extends Task<x, Time> {
  constructor() {
    super()
  }
  fork(succeed: (a: Time) => void, fail: (x: x) => void): number {
    return requestAnimationFrame(succeed)
  }
  abort(id: number): void {
    cancelAnimationFrame(id)
  }
}

let threadID = 0
class Spawn<x, y, a> extends Task<y, ThreadID> {
  constructor(task: Task<x, a>) {
    super()
    this.task = task
  }
  fork(succeed: (a: ThreadID) => void, fail: (x: y) => void): void {
    Promise.resolve(null).then(_ => Task.fork(this.task, noop, noop))

    succeed(++threadID)
  }

  task: Task<x, a>
}

class Send<x, a> extends Task<x, void> {
  constructor(address: Address<a>, message: a) {
    super()
    this.message = message
    this.address = address
  }
  fork(succeed: (a: void) => void, fail: (x: x) => void): void {
    succeed(void this.address(this.message))
  }

  message: a
  address: Address<a>
}

class Future<x, a> extends Task<x, a> {
  constructor(request: () => Promise<a>) {
    super()
    this.request = request
  }
  fork(succeed: (a: a) => void, fail: (x: x) => void): void {
    this.request().then(succeed, fail)
  }

  request: () => Promise<a>
}

class Then<x, a, b> extends Task<x, b> {
  constructor(task: Task<x, a>) {
    super()
    this.type = "Then"
    this.task = task
  }
  fork(succeed: (value: b) => void, fail: (error: x) => void): void {
    this.task.fork(
      (value: a): void => void this.next(value).fork(succeed, fail),
      fail
    )
  }
  next(input: a): Task<x, b> {
    throw Error("Subclass of absract Then must implement next method")
  }

  type: "Then"
  task: Task<x, a>
}

class Chain<x, a, b> extends Then<x, a, b> {
  constructor(task: Task<x, a>, next: (input: a) => Task<x, b>) {
    super(task)
    this.chainer = next
  }
  next(input: a): Task<x, b> {
    return this.chainer(input)
  }

  chainer: (input: a) => Task<x, b>
}

class Map<x, a, b> extends Then<x, a, b> {
  constructor(task: Task<x, a>, mapper: (input: a) => b) {
    // Note: Had to trick flow into thinking that `Format.prototype.handle` was
    // passed, otherwise it fails to infer polymorphic nature.
    super(task)
    this.mapper = mapper
  }
  next(input: a): Task<x, b> {
    return new Succeed(this.mapper(input))
  }

  mapper: (input: a) => b
}

class Catch<x, y, a> extends Task<y, a> {
  constructor(task: Task<x, a>) {
    super()
    this.type = "Catch"
    this.task = task
  }
  fork(succeed: (value: a) => void, fail: (error: y) => void): void {
    this.task.fork(
      succeed,
      error => void this.handle(error).fork(succeed, fail)
    )
  }
  handle(error: x): Task<y, a> {
    throw Error("Subclass of absract Catch must implement handle method")
  }

  type: "Catch"
  task: Task<x, a>
}

class Capture<x, y, a> extends Catch<x, y, a> {
  constructor(task: Task<x, a>, handle: (error: x) => Task<y, a>) {
    super(task)
    this.capturer = handle
  }

  handle(error: x): Task<y, a> {
    return this.capturer(error)
  }

  capturer: (error: x) => Task<y, a>
}

class Recover<x, y, a> extends Catch<x, y, a> {
  constructor(task: Task<x, a>, regain: (error: x) => a) {
    super(task)
    this.regain = regain
  }
  handle(error: x): Task<y, a> {
    return new Succeed(this.regain(error))
  }

  regain: (error: x) => a
}

class Format<x, y, a> extends Catch<x, y, a> {
  constructor(task: Task<x, a>, formatter: (error: x) => y) {
    super(task)
    this.formatter = formatter
  }
  handle(error: x): Task<y, a> {
    return new Fail(this.formatter(error))
  }

  formatter: (error: x) => y
}

const noop = () => void 0

let nextID = 0

type Root<x, a> =
  | Succeed<x, a>
  | Fail<x, a>
  | Then<x, *, a>
  | Catch<*, x, a>
  | Task<x, a>

class Thread<error, value, message, reason> {
  id: ProcessID
  root: Root<*, *>
  stack: Array<Catch<*, *, *> | Then<*, *, *>>
  position: number
  mailbox: Array<message>
  abortHandle: *
  isActive: boolean
  succeed: (input: value) => void
  fail: (error: error) => void
  isPending: boolean
  isPaused: boolean
  success: ?Succeed<*, *>
  failure: ?Fail<*, *>
  onSucceed: <value>(input: value) => void
  onFail: <error>(error: error) => void
  static fork<error, value, message, reason>(
    task: Task<error, value>,
    onSucceed: (input: value) => void,
    onFail: (error: error) => void
  ): Process<error, value, message, reason> {
    const process = new Thread()
    process.id = ++nextID
    process.position = 0
    process.root = task
    process.stack = []
    process.mailbox = []
    process.abortHandle = null
    process.isActive = true
    process.isPending = false
    process.isPaused = true
    process.success = null
    process.failure = null
    process.succeed = onSucceed
    process.fail = onFail
    process.onSucceed = process.onSucceed.bind(process)
    process.onFail = process.onFail.bind(process)
    process.schedule()
    return process
  }
  onSucceed(ok) {
    if (this.isPending) {
      this.isPending = false
      this.abortHandle = null

      if (this.success != null) {
        this.success.value = ok
      } else {
        this.success = new Succeed(ok)
      }

      this.root = this.success
      this.schedule()
    }
  }
  onFail(failure) {
    if (this.isPending) {
      this.isPending = false
      this.abortHandle = null

      if (this.failure != null) {
        this.failure.error = failure
      } else {
        this.failure = new Fail(failure)
      }

      this.root = this.failure
      this.schedule()
    }
  }
  kill(exit: reason) {
    if (this.isActive) {
      this.isActive = false
      if (this.root.abort) {
        this.root.abort(this.abortHandle)
      }
    }
  }
  schedule() {
    if (this.isPaused) {
      this.isPaused = false
      this.step()
    }
  }
  step() {
    const process = this
    while (process.isActive) {
      const root = process.root
      switch (root.type) {
        case "Succeed": {
          const task: Succeed<*, *> = (root: any)
          // If task succeeded skip all the error handling.
          while (
            process.position < process.stack.length &&
            process.stack[process.position] instanceof Catch
          ) {
            process.position++
          }

          // If end of the stack is reached then break
          if (process.position >= process.stack.length) {
            if (process.succeed != null) {
              process.succeed(task.value)
            }
            return
          }

          // Otherwise step into next task.
          const then = process.stack[process.position++]
          if (then instanceof Then) {
            process.root = then.next(task.value)
          }

          break
        }
        case "Fail": {
          const task: Fail<*, *> = (root: any)
          // If task fails skip all the chaining.
          while (
            process.position < process.stack.length &&
            process.stack[process.position] instanceof Then
          ) {
            process.position++
          }

          // If end of the stack is reached then break.
          if (this.position >= process.stack.length) {
            if (process.fail != null) {
              process.fail(task.error)
            }

            return
          }

          // Otherwise step into next task.
          const _catch = process.stack[process.position++]
          if (_catch instanceof Catch) {
            process.root = _catch.handle(task.error)
          }

          break
        }
        case "Then": {
          const task: Then<*, *, *> = (root: any)
          if (process.position === 0) {
            process.stack.unshift(task)
          } else {
            process.stack[--process.position] = task
          }

          process.root = task.task

          break
        }
        case "Catch": {
          const task: Catch<*, *, *> = (root: any)
          if (process.position === 0) {
            process.stack.unshift(task)
          } else {
            process.stack[--process.position] = task
          }

          process.root = task.task

          break
        }
        default: {
          const task = root
          process.isPending = true
          process.abortHandle = task.fork(process.onSucceed, process.onFail)
          process.isPaused = process.isPending
          if (this.isPending) {
            return
          }

          break
        }
      }
    }
  }
}
