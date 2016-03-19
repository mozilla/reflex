/* @flow */

/*::
import type {Time, ThreadID} from "./task"
import type {Address} from "./signal"

export type {ThreadID, Time}
*/

export class Task /*::<x, a>*/ {
  static create /*::<x, a>*/(execute/*:(succeed:(a:a) => void, fail:(x:x) => void) => void*/)/*:Task<x, a>*/ {
    return new Task(execute)
  }

  static future /*::<x, a>*/(request/*:() => Promise<a>*/)/*:Task<x, a>*/ {
    console.warn('Task.future is deprecated API use Task.create instead')
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

  static send /*::<x, a>*/ (address/*:Address<a>*/, message/*:a*/)/*:Task<x, void>*/ {
    return new Send(address, message)
  }

  static fork /*::<x, a>*/(task/*:Task<x, a>*/, onSucceed/*:(a:a) => void*/, onFail/*:(x:x) => void*/)/*:void*/ {
    run(new Running(task), onSucceed, onFail)
  }

  /*::
  execute: (succeed:(a:a) => void, fail:(x:x) => void) => void;
  */
  constructor(execute/*:(succeed:(a:a) => void, fail:(x:x) => void) => void*/) {
    this.execute = execute
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
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    this.execute
    ( succeed
    , fail
    )
  }
}



class Succeed /*::<x,a>*/ extends Task /*::<x, a>*/ {
  /*::
  value: a;
  */
  constructor(value/*:a*/) {
    super(Succeed.prototype.fork)
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
    super(Fail.prototype.fork)
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
    super(Sleep.prototype.fork)
    this.time = time
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    setTimeout(succeed, this.time, void(0))
  }
}

let threadID = 0
class Spawn /*::<x, y, a>*/ extends Task /*::<y, ThreadID>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor(task/*:Task<x, a>*/) {
    super(Spawn.prototype.fork)
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
    super(Send.prototype.fork)
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
    super(Future.prototype.fork)
    this.request = request
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    this.request().then(succeed, fail)
  }
}

class Chain /*::<x, a, b>*/ extends Task/*::<x, a>*/ {
  /*::
  task: Task<x, b>;
  next: (input:b) => Task<x, a>;
  */
  constructor(task/*:Task<x, b>*/, next/*:(input:b) => Task<x, a>*/) {
    super(Chain.prototype.fork)
    this.task = task
    this.next = next
  }
  fork(succeed/*:(value:a) => void*/, fail/*:(error:x) => void*/)/*:void*/ {
    this.task.fork
    ( value => this.next(value).fork(succeed, fail)
    , fail
    )
  }
}

class Map /*::<x, a, b>*/ extends Task/*::<x, b>*/ {
  /*::
  task: Task<x, a>;
  f: (input:a) => b;
  */
  constructor(task/*:Task<x, a>*/, f/*:(input:a) => b*/) {
    super(Map.prototype.fork)
    this.task = task
    this.f = f
  }
  fork(succeed/*:(value:b) => void*/, fail/*:(error:x) => void*/)/*:void*/ {
    this.task.fork
    ( value => succeed(this.f(value))
    , fail
    )
  }
}

class Capture/*::<x, y, a>*/extends Task/*::<y, a>*/{
  /*::
  task: Task<x, a>;
  handle: (error:x) => Task<y, a>;
  */
  constructor(task/*:Task<x, a>*/, handle/*:(error:x) => Task<y, a>*/) {
    super(Capture.prototype.fork)
    this.task = task
    this.handle = handle
  }
  fork(succeed/*:(value:a) => void*/, fail/*:(error:y) => void*/)/*:void*/ {
    this.task.fork
    ( succeed
    , error => this.handle(error).fork(succeed, fail)
    )
  }
}

class Format/*::<x, y, a>*/extends Task/*::<y, a>*/{
  /*::
  task: Task<x, a>;
  f: (input:x) => y;
  */
  constructor(task/*:Task<x, a>*/, f/*:(input:x) => y*/) {
    super(Format.prototype.fork)
    this.task = task
    this.f = f
  }
  fork(succeed/*:(value:a) => void*/, fail/*:(error:y) => void*/)/*:void*/ {
    this.task.fork
    ( succeed
    , error => fail(this.f(error))
    )
  }
}

class Deferred /*::<x, a>*/ extends Task /*::<x, a>*/ {
  /*::
  result: ?Task<x, a>;
  */
  constructor() {
    super(Deferred.prototype.fork)
  }
  resume(task/*:Task<x, a>*/)/*:void*/ {
    if (this.result != null) {
      throw Error('Deferred task can only be resumed once')
    }
    this.result = task
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    throw Error('Forking defferred task is not allowed')
  }
}

const noop = () => void(0)

class Running /*::<x, a>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor /*::<x, a>*/(task/*:Task<x, a>*/) {
    this.task = task
  }
}

class Done /*::<x, a>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor(task/*:Succeed<x, a> | Fail<x, a>*/) {
    this.task = task
  }
}

class Blocked /*::<x, a>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor(task/*:Task<x, a>*/) {
    this.task = task
  }
}

/*::
type Routine <x, a>
  = Blocked <x, a>
  | Done <x, a>
  | Running <x, a>
*/

const run = /*::<x, a>*/
  ( root/*:Routine<x, a>*/
  , succeed/*:(value:a) => void*/
  , fail/*:(error:x) => void*/
  )/*:void*/ =>
  {
    let routine = new Running(root.task)
    while (routine instanceof Running) {
      routine = step(root, routine.task, succeed, fail)
    }

    if (routine instanceof Blocked) {
      root.task = routine.task
    }

    if (routine instanceof Done) {
      const task = routine.task
      if (task instanceof Succeed) {
        succeed(task.value)
      }
      else if (task instanceof Fail) {
        fail(task.error)
      }
      else {
        throw Error('Task end up in an invalid state')
      }
    }
  }

const step = /*::<x, y, a, b>*/
  ( root/*:Routine*/
  , task/*:Task<x, a>*/
  , succeed/*:(value:b) => void*/
  , fail/*:(error:y) => void*/
  )/*:Routine*/ =>
  {
    if (task instanceof Succeed) {
      return new Done(task)
    }
    else if (task instanceof Fail) {
      return new Done(task)
    }
    else if (task instanceof Deferred) {
      if (task.result != null) {
        return new Running(task.result)
      }
      else {
        throw new Error('Blocked routine should not be resumed until blocking task is complete')
      }
    }
    else if (
      task instanceof Chain ||
      task instanceof Map ||
      task instanceof Capture ||
      task instanceof Format
    )
    {
      let routine = new Running(task.task)
      while (routine instanceof Running) {
        routine = step(root, routine.task, succeed, fail)
      }

      if (routine instanceof Done) {
        const active = routine.task

        if (active instanceof Succeed) {
          if (task instanceof Chain) {
            return new Running(task.next(active.value))
          }
          else if (task instanceof Map) {
            return new Done(new Succeed(task.f(active.value)))
          }
          else {
            return routine
          }
        }
        else if (active instanceof Fail) {
          if (task instanceof Capture) {
            return new Running(task.handle(active.error))
          }
          else if (task instanceof Format) {
            return new Done(new Fail(task.f(active.error)))
          }
          else {
            return routine
          }
        }
        else {
          return routine
        }
      }
      else if (routine instanceof Blocked) {
        if (task instanceof Chain) {
          return new Blocked(new Chain(routine.task, task.next))
        }
        else if (task instanceof Capture) {
          return new Blocked(new Capture(routine.task, task.handle))
        }
        else if (task instanceof Map) {
          return new Blocked(new Map(routine.task, task.f))
        }
        else if (task instanceof Format) {
          return new Blocked(new Format(routine.task, task.f))
        }
        else {
          return routine
        }
      }
      else {
        return routine
      }
    }
    else {
      let isBlocked = false
      let isResumed = false
      const deferred = new Deferred()

      task.fork
      ( value => {
          if (!isResumed) {
            isResumed = true
            deferred.resume(new Succeed(value))
            if (isBlocked) {
              run(root, succeed, fail)
            }
          }
        }
      , error => {
          if (!isResumed) {
            isResumed = true
            deferred.resume(new Fail(error))
            if (isBlocked) {
              run(root, succeed, fail)
            }
          }
        }
      )

      isBlocked = !isResumed

      const routine =
        ( deferred.result != null
        ? new Running(deferred.result)
        : new Blocked(deferred)
        )

      return routine
    }
  }
