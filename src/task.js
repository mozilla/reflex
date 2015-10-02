/* @flow */

/*::
import type {Address} from "./signal";
*/

export class Task/*::<x,a>*/{
  chain/*::<b>*/(next/*:(a:a) => Task<x,b>*/)/*:Then<x,a,b>*/ {
    return new Then(this, next)
  }
  catch/*::<y>*/(recover/*:(x:x) => Task<y,a>*/)/*:Catch<x,y,a>*/ {
    return new Catch(this, recover)
  }
}

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
type Complete = Succeed|Fail;
*/

/*::
type PerformIO <x,a> = (resume: (task: Task<x,a>) => void) => void;
*/
class IO/*::<x,a>*/extends Task/*::<x,a>*/{
  /*::
  perform: PerformIO<x,a>;
  */
  constructor(perform/*:PerformIO<x,a>*/) {
    super()
    this.perform = perform
  }
}


class Future/*::<x,a>*/extends IO/*::<x,a>*/{
   constructor(perform/*:() => Promise<a>*/) {
     super(deliver => void(perform()
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

export const succeed = /*::<x,a>*/(a/*:a*/)/*:Task<x,a>*/ => new Succeed(a);
export const fail = /*::<x,a>*/(error/*:x*/)/*:Task<x,a>*/ => new Fail(error);
export const io = /*::<x,a>*/(perform/*:PerformIO<x,a>*/)/*:IO<x,a>*/ =>
  new IO(perform)
export const future = /*::<x,a>*/(perform/*:() => Promise<a>*/)/*:Future<x,a>*/ =>
  new Future(perform)
export const onSuccess = /*::<x,a,b>*/(task/*:Task<x,a>*/, next/*:(a:a)=>Task<x,b>*/)/*:Then<x,a,b>*/ =>
  new Then(task, next)
export const onFailure = /*::<x,y,a>*/(task/*:Task<x,a>*/, recover/*:(x:x)=>Task<y,a>*/)/*:Catch<x,y,a>*/ =>
  new Catch(task, recover)

/*::
export type ThreadID = number;
*/
export const spawn =/*::<x,y,a>*/(task/*:Task<x,a>*/)/*:Task<y,ThreadID>*/=>
  io(deliver => {
    const id = setTimeout(perform, 0, task)
    deliver(succeed(id))
  })


/*::
export type Time = number;
*/
export const sleep =/*::<x>*/(time/*:Time*/)/*:Task<x,void>*/=>
 io(deliver => {
   setTimeout(() => deliver(succeed(void(0))), time)
 })


const noop = () => void(0)

export const perform =/*::<x,a>*/(task/*:Task<x,a>*/)/*:void*/=>
  run(new Running(task), noop)

export const execute =/*::<x,a>*/(task/*:Task<x,a>*/, onComplete/*:()=>void*/)/*:void*/=> {
  run(new Running(task), onComplete)
}

class Routine {
  /*::
  task: Task<any,any>;
  */
  constructor(task) {
    this.task = task
  }
}

class Running extends Routine {}
class Done extends Routine {}
class Blocked extends Routine {}


export const run =/*::<x,a>*/(root/*:Routine*/, onComplete/*:()=>void*/)/*:void*/=> {
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

const step = (root/*:Routine*/, task/*:Task<any,any>*/, onComplete/*:()=>void*/)/*:Done|Blocked|Running*/=> {
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
    task.perform(next => {
      isResumed = true
      deferred.resume(next)

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

export const send =/*::<x,a>*/(address/*:Address<a>*/, action/*:a*/)/*:Task<x,void>*/ =>
  io(deliver => deliver(succeed(address(action))))


export const service = /*::<x,a,b>*/(address/*:Address<a>*/)/*:(task:Task<x,a>)=>void*/ => task => {
  const respond = (action/*:a*/)/*Task<x,b>*/ =>
    action != null ? send(address, action) : succeed(void(0))

  perform(onSuccess(task, respond))
}
