/* @noflow */

/*::
import type {Task, Request, ThreadID} from "./task"
import type {Address} from "./signal"

export type {Task, ThreadID}
*/



export class Base/*::<x,a>*/{
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
Base.prototype.$type = "Task.Task"

class Deferred/*::<x,a,b>*/extends Base/*::<x,b>*/ {
  /*::
  task: ?Task<x,a>;
  */
  resume(task/*:Task<x,a>*/) {
    this.task = task
  }
}

class Succeed/*::<x,a>*/extends Base/*::<x,a>*/{
  /*::
  value: a;
  */
  constructor(value/*:a*/) {
    super()
    this.value = value
  }
}

class Fail/*::<x,a>*/extends Base/*::<x,a>*/{
  /*::
  value: x;
  */
  constructor(error/*:x*/) {
    super()
    this.value = error
  }
}

class IO/*::<x,a>*/extends Base/*::<x,a>*/{
  /*::
  request: Request<x,a>;
  */
  constructor(request/*:Request<x,a>*/) {
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

class Then/*::<x,a,b>*/extends Base/*::<x,b>*/{
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

class Catch/*::<x,y,a>*/extends Base/*::<y,a>*/{
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

export const succeed = /*::<x, a>*/
  (value/*:a*/)/*:Task<x, a>*/ =>
  new Succeed(value)

export const fail = /*::<x, a>*/
  (error/*:x*/)/*:Task<x, a>*/ =>
  new Fail(error)

export const io = /*::<x, a>*/
  (perform/*:Request<x,a>*/)/*:Task<x, a>*/ =>
  new IO(perform)

export const future = /*::<x, a>*/
  (promise/*:() => Promise<a>*/)/*:Task<x, a>*/ =>
  new Future(promise)

export const chain = /*::<x, a, b>*/
  ( task/*:Task<x, a>*/
  , next/*:(value:a) => Task<x,b>*/
  )/*:Task<x, b>*/ =>
  new Then(task, next)

export const recover = /*::<x, y, b>*/
  ( task/*:Task<x, a>*/
  , report/*:(error:x) => Task<y, a>*/
  )/*:Task<y, a>*/ =>
  new Catch(task, report)

export const spawn = /*::<x, y, a>*/
  (task/*:Task<x,a>*/)/*:Task<y, ThreadID>*/ =>
  io(deliver => {
    const id = setTimeout(perform, 0, task)
    deliver(succeed(id))
  })


/*::
export type Time = number;
*/
export const sleep = /*::<x>*/
  (time/*:number*/)/*:Task<x, void>*/ =>
  io(deliver => {
    setTimeout(() => deliver(succeed(void(0))), time)
  })


const noop = () => void(0)

export const perform = /*::<x, a>*/
  (task/*:Task<x,a>*/)/*:void*/ =>
  run(new Running(task), noop)

export const execute = /*::<x, a>*/
  ( task/*:Task<x, a>*/
  , onComplete/*:() => void*/
  )/*:void*/ =>
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


const run = (root, onComplete) => {
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

export const send = /*::<x, a>*/
  ( address/*:Address<a>*/
  , action/*:a*/
  )/*:Task<x, void>*/ =>
  io(deliver => deliver(succeed(address(action))))
