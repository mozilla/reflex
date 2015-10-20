/* @flow */

/*::
import * as type from "../type/task";
import type {Address} from "../type/signal";
*/

export class Task/*::<x,a>*/{
  /*::
  $type: "Task.Task";
  */
  chain/*::<b>*/(next/*:(a:a) => Task<x,b>*/)/*:Then<x,a,b>*/ {
    return new Then(this, next)
  }
  map/*::<b>*/(f/*:(a:a)=>b*/)/*:Task<x,b>*/ {
    return new Then(this, a => succeed(f(a)))
  }
  catch/*::<y>*/(recover/*:(x:x) => Task<y,a>*/)/*:Catch<x,y,a>*/ {
    return new Catch(this, recover)
  }
}
Task.prototype.$type = "Task.Task"

class Deferred/*::<x,a,b>*/extends Task/*::<x,b>*/ {
  /*::
  task: ?Task<x,a>;
  */
  resume(task/*:Task<x,a>*/) {
    this.task = task
  }
}

class Succeed/*::<x,a>*/extends Task/*::<x,a>*/{
  /*::
  value: a;
  */
  constructor(value/*:a*/) {
    super()
    this.value = value
  }
}

class Fail/*::<x,a>*/extends Task/*::<x,a>*/{
  /*::
  value: x;
  */
  constructor(error/*:x*/) {
    super()
    this.value = error
  }
}

/*::
type PerformIO <x,a> = (resume: (task: Task<x,a>) => void) => void;
*/
class IO/*::<x,a>*/extends Task/*::<x,a>*/{
  /*::
  request: type.Request<x,a>;
  */
  constructor(request/*:type.Request<x,a>*/) {
    super()
    this.request = request
  }
}


class Future/*::<x,a>*/extends IO/*::<x,a>*/{
   constructor(promise/*:() => Promise<a>*/) {
     super(deliver => void(promise()
                            .then(succeed, fail)
                            .then(deliver)))
  }
}

class Then/*::<x,a,b>*/extends Task/*::<x,b>*/{
  /*::
  task: Task<x, a>;
  resume: (a:a) => Task<x,b>;
  */
  constructor(task/*:Task<x,a>*/, resume/*:(a:a)=>Task<x, b>*/) {
    super()
    this.task = task
    this.resume = resume
  }
}

class Catch/*::<x,y,a>*/extends Task/*::<y,a>*/{
  /*::
  task: Task<x,a>;
  resume: (x:x) => Task<y,a>;
  */
  constructor(task/*:Task<x,a>*/, resume/*:(x:x)=>Task<y,a>*/) {
    super()
    this.task = task
    this.resume = resume
  }
}

/*::
type Chain = Then<any,any,any>|Catch<any,any,any>
*/

export const succeed/*:type.succeed*/ = value => new Succeed(value);
export const fail/*:type.fail*/ = error => new Fail(error);
export const io/*:type.io*/ = perform => new IO(perform)
export const future/*:type.future*/ = promise => new Future(promise)
export const chain/*:type.chain*/ = (task, next) => new Then(task, next)
export const recover/*:type.recover*/ = (task, report) => new Catch(task, report)

export const spawn/*:type.spawn*/ = task =>
  io(deliver => {
    const id = setTimeout(perform, 0, task)
    deliver(succeed(id))
  })


/*::
export type Time = number;
*/
export const sleep/*:type.sleep*/ = time =>
 io(deliver => {
   setTimeout(() => deliver(succeed(void(0))), time)
 })


const noop = () => void(0)

export const perform/*:type.perform*/ = task =>
  run(new Running(task), noop)

export const execute/*:type.execute*/ = (task, onComplete) =>
  run(new Running(task), onComplete)

class Running {
  /*::
  $type: "Task.Routine.Running";
  task: Task<any,any>;
  */
  constructor(task) {
    this.task = task
  }
}
Running.prototype.$type = "Task.Routine.Running"

class Done {
  /*::
  $type: "Task.Routine.Done";
  task: Task<any,any>;
  */
  constructor(task) {
    this.task = task
  }
}
Done.prototype.$type = "Task.Routine.Done"

class Blocked {
  /*::
  $type: "Task.Routine.Blocked";
  task: Task<any, any>;
  */
  constructor(task) {
    this.task = task
  }
}
Blocked.prototype.$type = "Task.Routine.Blocked"


export const run/*:type.run*/ = (root, onComplete) => {
  let routine = new Running(root.task)
  while (routine instanceof Running) {
    routine = step(root, routine.task, onComplete)
  }

  if (routine instanceof Blocked) {
    root.task = routine.task
  }

  if (routine instanceof Done) {
    onComplete()
  }
}

const step = (root/*:type.Routine*/, task/*:Task<any,any>*/, onComplete/*:()=>void*/)/*:Done|Blocked|Running*/=> {
  if (task instanceof Succeed) {
    return new Done(task)
  }

  if (task instanceof Fail) {
    return new Done(task)
  }

  if (task instanceof Deferred) {
    if (task.task != null) {
      return new Running(task.task)
    } else {
      return new Blocked(task)
    }
  }

  if (task instanceof IO) {
    let isBlocked = false
    let isResumed = false
    let deferred = new Deferred()

    // TODO: Report bug to a flowtype as it does not correctly typecheck
    // if extra non `task` variable is set from with in the callback.
    task.request(respond => {
      isResumed = true
      deferred.resume(respond)

      if (isBlocked) {
        run(root, onComplete)
      }
    })

    isBlocked = !isResumed

    return isResumed ? new Running(deferred) :
           new Blocked(deferred);
  }

  if (task instanceof Then || task instanceof Catch) {
    // Cast type cause flow is unable to derive it from
    // instanceof checks.
    let routine = new Running(task.task)
    while (routine instanceof Running) {
      routine = step(root, routine.task, onComplete)
    }

    if (routine instanceof Done) {
      const active = routine.task

      if (task instanceof Then) {
        if (active instanceof Succeed) {
          return new Running(task.resume(active.value))
        }
      }

      if (task instanceof Catch) {
        if (active instanceof Fail) {
          return new Running(task.resume(active.value))
        }
      }

      return new Running(active)
    } else { // Blocked
      if (task instanceof Then) {
        return new Blocked(new Then(routine.task, task.resume))
      }
      if (task instanceof Catch) {
        return new Blocked(new Catch(routine.task, task.resume))
      }
    }
  }

  return new Running(task)
}

export const send/*:type.send*/ = (address, action) =>
  io(deliver => deliver(succeed(address(action))))
