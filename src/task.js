/* @flow */


/*::
import type {Address} from "./signal"

export type ProcessID = number
export type ThreadID = number
export type Time = number

type Abort <reason> =
  (reason:reason) => void;
*/

export class Task /*::<x, a>*/ {
  static create /*::<x, a>*/(execute/*:(succeed:(a:a) => void, fail:(x:x) => void) => ?Abort<any>*/)/*:Task<x, a>*/ {
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

  static send /*::<x, a>*/ (address/*:Address<a>*/, message/*:a*/)/*:Task<x, void>*/ {
    return new Send(address, message)
  }

  static fork /*::<x, a, message, reason>*/(task/*:Task<x, a>*/, onSucceed/*:(a:a) => void*/, onFail/*:(x:x) => void*/)/*:Process<message, reason>*/ {
    return Process.fork(task, onSucceed, onFail)
  }

  /*::
  execute: (succeed:(a:a) => void, fail:(x:x) => void) => ?Abort<any>;
  */
  constructor(execute/*:(succeed:(a:a) => void, fail:(x:x) => void) => ?Abort<any>*/) {
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
    super(Succeed$prototype$fork)
    this.value = value
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    succeed(this.value)
  }
}
const Succeed$prototype$fork = Succeed.prototype.fork

class Fail /*::<x, a>*/ extends Task /*::<x, a>*/ {
  /*::
  error: x;
  */
  constructor(error/*:x*/) {
    super(Fail$prototype$fork)
    this.error = error
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    fail(this.error)
  }
}
const Fail$prototype$fork = Fail.prototype.fork

class Sleep /*::<x, a:void>*/ extends Task /*::<x, void>*/ {
  /*::
  time: Time;
  */
  constructor(time/*:Time*/) {
    super(Sleep$prototype$execute)
    this.time = time
  }
  execute(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:?Abort<void>*/ {
    const id = setTimeout(succeed, this.time, void(0))
    return () => clearTimeout(id)
  }
}
const Sleep$prototype$execute = Sleep.prototype.execute

let threadID = 0
class Spawn /*::<x, y, a>*/ extends Task /*::<y, ThreadID>*/ {
  /*::
  task: Task<x, a>;
  */
  constructor(task/*:Task<x, a>*/) {
    super(Spawn$prototype$fork)
    this.task = task
  }
  fork(succeed/*:(a:ThreadID) => void*/, fail/*:(x:y) => void*/)/*:void*/ {
    Promise
    .resolve(null)
    .then(_ => Task.fork(this.task, noop, noop))

    succeed(++threadID)
  }
}
const Spawn$prototype$fork = Spawn.prototype.fork

class Send /*::<x, a>*/ extends Task /*::<x, void>*/ {
  /*::
  message: a;
  address: Address<a>;
  */
  constructor(address/*:Address<a>*/, message/*:a*/) {
    super(Send$prototype$fork)
    this.message = message
    this.address = address
  }
  fork(succeed/*:(a:void) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    succeed(void(this.address(this.message)))
  }
}
const Send$prototype$fork = Send.prototype.fork

class Future /*::<x, a>*/ extends Task/*::<x, a>*/ {
  /*::
  request: () => Promise<a>;
  */
  constructor(request/*:() => Promise<a>*/) {
    super(Future$prototype$fork)
    this.request = request
  }
  fork(succeed/*:(a:a) => void*/, fail/*:(x:x) => void*/)/*:void*/ {
    this.request().then(succeed, fail)
  }
}
const Future$prototype$fork = Future.prototype.fork

class Chain /*::<x, a, b>*/ extends Task/*::<x, b>*/ {
  /*::
  task: Task<x, a>;
  next: (input:a) => Task<x, b>;
  */
  constructor(task/*:Task<x, a>*/, next/*:(input:a) => Task<x, b>*/) {
    super(Chain$prototype$fork)
    this.task = task
    this.next = next
  }
  fork(succeed/*:(value:b) => void*/, fail/*:(error:x) => void*/)/*:void*/ {
    this.task.fork
    ( value => this.next(value).fork(succeed, fail)
    , fail
    )
  }
}
const Chain$prototype$fork = Chain.prototype.fork

class Map /*::<x, a, b>*/ extends Chain/*::<x, a, b>*/ {
  /*::
  mapper: (input:a) => b;
  */
  constructor(task/*:Task<x, a>*/, mapper/*:(input:a) => b*/) {
    // Note: Had to trick flow into thinking that `Format.prototype.handle` was
    // passed, otherwise it fails to infer polymorphic nature.
    super(task, (Map$prototype$next/*::, Map.prototype.next*/))
    this.task = task
    this.mapper = mapper
  }
  next(input/*:a*/)/*:Task<x, b>*/ {
    return new Succeed(this.mapper(input))
  }
}
const Map$prototype$next = Map.prototype.next

class Capture/*::<x, y, a>*/extends Task/*::<y, a>*/{
  /*::
  task: Task<x, a>;
  handle: (error:x) => Task<y, a>;
  */
  constructor(task/*:Task<x, a>*/, handle/*:(error:x) => Task<y, a>*/) {
    super(Capture$prototype$fork)
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
const Capture$prototype$fork = Capture.prototype.fork

class Format/*::<x, y, a>*/extends Capture/*::<x, y, a>*/{
  /*::
  formatter: (error:x) => y;
  */
  constructor(task/*:Task<x, a>*/, formatter/*:(error:x) => y*/) {
    // Note: Had to trick flow into thinking that `Format.prototype.handle` was
    // passed, otherwise it fails to infer polymorphic nature.
    super(task, (Format$prototype$handle/*::,Format.prototype.handle*/))
    this.task = task
    this.formatter = formatter
  }
  handle(error/*:x*/)/*:Task<y, a>*/ {
    return new Fail(this.formatter(error))
  }
}
const Format$prototype$handle = Format.prototype.handle


const noop = () => void(0)

window.reflex$Process$$nextID =
  ( window.reflex$Process$$nextID == null
  ? 0
  : window.reflex$Process$$nextID
  );


class Process /*::<message, reason>*/ {
  /*::
  id: ProcessID;
  root: Task<any, any>;
  stack: Array<Capture<*, *, *> | Chain<*, *, *>>;
  position: number;
  mailbox: Array<message>;
  abort: ?Abort<reason>;
  exit: ?reason;
  isActive: boolean;
  */
  static fork /*::<error, value, message, reason>*/(task/*:Task<error, value>*/, onSucceed/*:(input:value) => void*/, onFail/*:(error:error) => void*/)/*:Process<message, reason>*/ {
    const process = new Process
    ( task
      .map(onSucceed)
      .format(onFail)
    )
    process.schedule()
    return process
  }
  constructor(task/*:Task<any, any>*/) {
    this.id = window.reflex$Process$$nextID++;
    this.position = 0;
    this.root = task;
    this.stack = [];
    this.mailbox = [];
    this.exit = null;
  }
  kill(reason/*:reason*/) {
    if (this.isActive) {
      this.isActive = false
      this.exit = reason
      if (this.abort) {
        this.abort(reason)
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
          process.stack[process.position] instanceof Capture
        )
        {
          process.position ++
        }

        // If end of the stack is reached then break
        if (process.position >= process.stack.length) {
          break
        }

        // Otherwise step into next task.
        const chain = process.stack[process.position++]
        /*:: if (chain instanceof Chain) */
        process.root = chain.next(task.value)
        continue;
      }

      if (task instanceof Fail) {
        // If task fails skip all the chaining.
        while
        ( process.position < process.stack.length &&
          process.stack[process.position] instanceof Chain
        )
        {
          process.position ++
        }

        // If end of the stack is reached then break.
        if (this.position >= process.stack.length) {
          break
        }

        // Otherwise step into next task.
        const capture = process.stack[process.position++]
        /*:: if (capture instanceof Capture) */
        process.root = capture.handle(task.error)
        continue
      }

      if (task instanceof Chain) {
        process.stack.splice(0, process.position, task)
        process.root = task.task
        process.position = 0
        continue
      }

      if (task instanceof Capture) {
        process.stack.splice(0, process.position, task)
        process.root = task.task
        process.position = 0
        continue
      }

      if (task instanceof Task) {
        let ended = false
        process.abort = task.execute
        ( value => {
            if (!ended) {
              ended = true
              process.root = new Succeed(value)
              process.abort = null
              process.schedule()
            }
          }
        , error => {
            if (!ended) {
              ended = true
              process.root = new Fail(error)
              process.abort = null
              process.schedule()
            }
          }
        );
        break;
      }
    }
  }
}
