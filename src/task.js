/* @flow */

import {requestAnimationFrame, cancelAnimationFrame} from "./preemptive-animation-frame"

/*::
import type {Address} from "./signal"
import type {ProcessID, ThreadID, Time} from "./task"
*/

export class Task /*::<x, a>*/ {
  /*::
  fork: (succeed:(a:a) => void, fail:(x:x) => void) => any;
  abort: (handle:*) => void;
  */
  static create /*::<x, a>*/(execute/*:(succeed:(a:a) => void, fail:(x:x) => void) => void*/)/*:Task<x, a>*/ {
    console.warn('Task.create is deprecated API use new Task instead')
    return new Task(execute)
  }
  static future /*::<x, a>*/(request/*:() => Promise<a>*/)/*:Task<x, a>*/ {
    console.warn('Task.future is deprecated API use new Task instead')
    return new Future(request)
  }
  static succeed /*::<x, a>*/(value/*:a*/)/*:Task<x, a>*/ {
    return new Succeed(value)
  }

  static fail /*::<x, a>*/ (error/*:x*/)/*:Task<x, a>*/ {
    return new Fail(error)
  }

  static spawn /*::<x, y, a>*/ (task/*:Task<x, a>*/)/*:Task<y, ThreadID>*/ {
    return new Spawn(task)
  }

  static sleep /*::<x>*/ (time:Time)/*:Task<x, void>*/ {
    return new Sleep(time)
  }

  static requestAnimationFrame /*::<x>*/ ()/*:Task<x, Time>*/ {
    return new RequestAnimationFrame()
  }

  static send /*::<x, a>*/ (address/*:Address<a>*/, message/*:a*/)/*:Task<x, void>*/ {
    return new Send(address, message)
  }

  static fork /*::<x, a, message, reason>*/(task/*:Task<x, a>*/, onSucceed/*:(a:a) => void*/, onFail/*:(x:x) => void*/)/*:Process<x, a, message, reason>*/ {
    return Process.fork(task, onSucceed, onFail)
  }

  constructor /*::<handle>*/ (
    execute/*:?(succeed:(a:a) => void, fail:(x:x) => void) => handle*/
  , cancel/*:?(handle:handle) => void*/
  ) {
    if (execute != null) {
      this.fork = execute
    }
    if (cancel != null) {
      this.abort = cancel
    }
  }
  chain /*::<b>*/(next/*:(a:a) => Task<x,b>*/)/*:Task<x, b>*/ {
    return new Chain(this, next)
  }
  map /*::<b>*/(f/*:(input:a) => b*/)/*:Task<x, b>*/ {
    return new Map(this, f)
  }
  capture /*::<y>*/(handle/*:(error:x) => Task<y, a>*/)/*:Task<y, a>*/ {
    return new Capture(this, handle)
  }
  format /*::<y>*/ (f/*:(input:x) => y*/)/*:Task<y, a>*/ {
    return new Format(this, f)
  }
  recover (regain/*:(error:x) => a*/)/*:Task<x, a>*/ {
    return new Recover(this, regain)
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:any*/ {
  }
  abort /*::<handle>*/(handle/*:handle*/)/*:void*/ {

  }
}

class Succeed /*::<x,a>*/ extends Task /*::<x, a>*/ {
  /*::
  value: a;
  */
  constructor(value/*:a*/) {
    super()
    this.value = value
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    succeed(this.value)
  }
}

class Fail /*::<x, a>*/ extends Task /*::<x, a>*/ {
  /*::
  error: x;
  */
  constructor(error/*:x*/) {
    super()
    this.error = error
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    fail(this.error)
  }
}


class Sleep /*::<x, a:void>*/ extends Task /*::<x, void>*/ {
  /*::
  time: Time;
  */
  constructor(time/*:Time*/) {
    super()
    this.time = time
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:number*/ {
    return setTimeout(succeed, this.time, void(0))
  }
  abort(id/*:number*/)/*:void*/ {
    clearTimeout(id)
  }
}

class RequestAnimationFrame /*::<x>*/ extends Task /*::<x, Time>*/ {
  constructor() {
    super()
  }
  fork(succeed/*:(a:Time) => void*/, fail/*:(x:x) => void*/)/*:number*/ {
    return requestAnimationFrame(succeed)
  }
  abort(id/*:number*/)/*:void*/ {
    cancelAnimationFrame(id)
  }
}

let threadID = 0
class Spawn /*::<x, y, a>*/ extends Task /*::<y, ThreadID>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor(task/*:Task<x, a>*/) {
    super()
    this.task = task
  }
  fork(succeed/*:(a:ThreadID) => void*/, fail/*:(x:y) => void*/)/*:void*/ {
    Promise
    .resolve(null)
    .then(_ => Task.fork(this.task, noop, noop))

    succeed(++threadID)
  }
}

class Send /*::<x, a>*/ extends Task /*::<x, void>*/ {
  /*::
  message: a;
  address: Address<a>;
  */
  constructor(address/*:Address<a>*/, message/*:a*/) {
    super()
    this.message = message
    this.address = address
  }
  fork(succeed/*:(a:void) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    succeed(void(this.address(this.message)))
  }
}

class Future /*::<x, a>*/ extends Task/*::<x, a>*/ {
  /*::
  request: () => Promise<a>;
  */
  constructor(request/*:() => Promise<a>*/) {
    super()
    this.request = request
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    this.request().then(succeed, fail)
  }
}

class Then /*::<x, a, b>*/ extends Task/*::<x, b>*/ {
  /*::
  task: Task<x, a>;
  next: (input:a) => Task<x, b>;
  */
  constructor(task/*:Task<x, a>*/) {
    super()
    this.task = task
  }
  fork(succeed/*:(value:b) => void*/, fail/*:(error:x) => void*/)/*:void*/ {
    this.task.fork
    ( value => void(this.next(value).fork(succeed, fail))
    , fail
    )
  }
}

class Chain /*::<x, a, b>*/ extends Then/*::<x, a, b>*/ {
  constructor(task/*:Task<x, a>*/, next/*:(input:a) => Task<x, b>*/) {
    super(task)
    this.next = next
  }
}

class Map /*::<x, a, b>*/ extends Then/*::<x, a, b>*/ {
  /*::
  mapper: (input:a) => b;
  */
  constructor(task/*:Task<x, a>*/, mapper/*:(input:a) => b*/) {
    // Note: Had to trick flow into thinking that `Format.prototype.handle` was
    // passed, otherwise it fails to infer polymorphic nature.
    super(task)
    this.mapper = mapper
  }
  next(input/*:a*/)/*:Task<x, b>*/ {
    return new Succeed(this.mapper(input))
  }
}

class Catch /*::<x, y, a>*/ extends Task/*::<y, a>*/ {
  /*::
  task: Task<x, a>;
  handle: (error:x) => Task<y, a>;
  */
  constructor(task/*:Task<x, a>*/) {
    super()
    this.task = task
  }
  fork(succeed/*:(value:a) => void*/, fail/*:(error:y) => void*/)/*:void*/ {
    this.task.fork
    ( succeed
    , error => void(this.handle(error).fork(succeed, fail))
    )
  }
}

class Capture/*::<x, y, a>*/extends Catch/*::<x, y, a>*/{
  /*::
  handle: (error:x) => Task<y, a>;
  */
  constructor(task/*:Task<x, a>*/, handle/*:(error:x) => Task<y, a>*/) {
    super(task)
    this.handle = handle
  }
}

class Recover/*::<x, a>*/extends Catch/*::<x, x, a>*/ {
  /*::
  regain: (error:x) => a;
  */
  constructor(task/*:Task<x, a>*/, regain/*:(error:x) => a*/) {
    super(task)
    this.regain = regain
  }
  handle(error/*:x*/)/*:Task<x, a>*/ {
    return new Succeed(this.regain(error))
  }
}

class Format/*::<x, y, a>*/extends Catch/*::<x, y, a>*/{
  /*::
  formatter: (error:x) => y;
  */
  constructor(task/*:Task<x, a>*/, formatter/*:(error:x) => y*/) {
    super(task)
    this.formatter = formatter
  }
  handle(error/*:x*/)/*:Task<y, a>*/ {
    return new Fail(this.formatter(error))
  }
}


const noop = () => void(0)

let nextID = 0

class Process /*::<error, value, message, reason>*/ {
  /*::
  id: ProcessID;
  root: Task<*, *>;
  stack: Array<Catch<*, *, *> | Then<*, *, *>>;
  position: number;
  mailbox: Array<message>;
  abortHandle: *;
  isActive: boolean;
  succeed: ?(input:value) => void;
  fail: ?(error:error) => void;
  isPending: boolean;
  success: ?Succeed<*, *>;
  failure: ?Fail<*, *>;
  onSucceed: <value> (input:value) => void;
  onFail: <error> (error:error) => void;
  */
  static fork /*::<error, value, message, reason>*/(task/*:Task<error, value>*/, onSucceed/*:(input:value) => void*/, onFail/*:(error:error) => void*/)/*:Process<error, value, message, reason>*/ {
    const process = new Process(task)
    process.succeed = onSucceed
    process.fail = onFail
    process.schedule()
    return process
  }
  constructor(task/*:Task<any, any>*/) {
    this.id = ++nextID
    this.position = 0
    this.root = task
    this.stack = []
    this.mailbox = []
    this.abortHandle = null
    this.isActive = true
    this.isPending = false
    this.success = null
    this.failure = null
    this.succeed = null
    this.fail = null
    this.onSucceed = this.onSucceed.bind(this)
    this.onFail = this.onFail.bind(this)
  }
  onSucceed(value) {
    if (this.isPending) {
      this.isPending = false
      this.abortHandle = null

      if (this.success != null) {
        this.success.value = value
      }
      else {
        this.success = new Succeed(value)
      }

      this.root = this.success
      this.schedule()
    }
  }
  onFail(error) {
    if (this.isPending) {
      this.isPending = false
      this.abortHandle = null

      if (this.failure != null) {
        this.failure.error = error
      }
      else {
        this.failure = new Fail(error)
      }

      this.root = this.failure
      this.schedule()
    }
  }
  kill(reason/*:reason*/) {
    if (this.isActive) {
      this.isActive = false
      if (this.root.abort) {
        this.root.abort(this.abortHandle)
      }
    }
  }
  schedule() {
    this.step()
  }
  step() {
    const process = this
    while (process.isActive) {
      const task = process.root
      if (task instanceof Succeed) {
        // If task succeeded skip all the error handling.
        while
        ( process.position < process.stack.length &&
          process.stack[process.position] instanceof Catch
        )
        {
          process.position ++
        }

        // If end of the stack is reached then break
        if (process.position >= process.stack.length) {
          if (process.succeed != null) {
            process.succeed(task.value)
          }
          break
        }

        // Otherwise step into next task.
        const then = process.stack[process.position++]
        /*:: if (then instanceof Then) */
        process.root = then.next(task.value)
        continue
      }

      if (task instanceof Fail) {
        // If task fails skip all the chaining.
        while
        ( process.position < process.stack.length &&
          process.stack[process.position] instanceof Then
        )
        {
          process.position ++
        }

        // If end of the stack is reached then break.
        if (this.position >= process.stack.length) {
          if (process.fail != null) {
            process.fail(task.error)
          }
          break
        }

        // Otherwise step into next task.
        const _catch = process.stack[process.position++]
        /*:: if (_catch instanceof Catch) */
        process.root = _catch.handle(task.error)
        continue
      }

      if (task instanceof Then) {
        if (process.position === 0) {
          process.stack.unshift(task)
        }
        else {
          process.stack[--process.position] = task
        }

        process.root = task.task

        continue
      }

      if (task instanceof Catch) {
        if (process.position === 0) {
          process.stack.unshift(task)
        }
        else {
          process.stack[--process.position] = task
        }

        process.root = task.task

        continue
      }

      if (task instanceof Task) {
        process.isPending = true
        process.abortHandle = task.fork
        ( process.onSucceed
        , process.onFail
        )
        break
      }
    }
  }
}
