/* @flow */


export class Task/*::<error, result>*/{}

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


// class Future/*::<x,a>*/extends IO/*::<x,a>*/{
//   constructor(perform/*:() => Promise<a>*/) {
//     super(deliver => void(perform()
//                             .then(succeed, fail)
//                             .then(deliver)))
//   }
// }

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

export var succeed = /*::<x,a>*/(a/*:a*/)/*:Task<x,a>*/ => new Succeed(a);
export var fail = /*::<x,a>*/(error/*:x*/)/*:Task<x,a>*/ => new Fail(error);
export var io = /*::<x,a>*/(perform/*:PerformIO<x,a>*/)/*:IO<x,a>*/ =>
  new IO(perform);
// export var future = perform => new Future(perform);
export var onSuccess = /*::<x,a,b>*/(task/*:Task<x,a>*/, next/*:(a:a)=>Task<x,b>*/)/*:Then<x,a,b>*/ =>
  new Then(task, next);
export var onFailure = /*::<x,y,a>*/(task/*:Task<x,a>*/, recover/*:(x:x)=>Task<y,a>*/)/*:Catch<x,y,a>*/ =>
  new Catch(task, recover);

// /*::
// type ThreadID = number
// */
// export var spawn =/*::<x,y,a>*/(task/*:Task<x,a>*/)/*:Task<y,ThreadID>*/=>
//   io(deliver => {
//     var id = setTimeout(perform, 0, task)
//     deliver(succeed(id))
//   })


// /*
// ::
// type Time = number
// */
// export var sleep =/*::<x>*/(time/*:Time*/)/*:Task<x,void>*/=>
//  io(deliver => {
//    setTimeout(() => deliver(succeed(void(0))), time)
//  })


var noop = () => void(0)

export var perform =/*::<x,a>*/(task/*:Task<x,a>*/)/*:void*/=>
  run(task, noop);

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


export var run =/*::<x,a>*/(task/*:Task<x,a>*/, onComplete/*:()=>void*/)/*:void*/=> {
  var routine = new Running(task)
  while (routine instanceof Running) {
    routine = step(routine.task, onComplete)
  }

  if (routine instanceof Done) {
    onComplete()
  }
}


var step = (task/*:Task<any,any>*/, onComplete/*:()=>void*/)/*:Done|Blocked|Running*/=> {
  if (task instanceof Succeed) {
    return new Done(task)
  }

  if (task instanceof Fail) {
    return new Done(task)
  }

  if (task instanceof IO) {
    var isBlocked = false
    var isResumed = false

    // TODO: Report bug to a flowtype as it does not correctly typecheck
    // if extra non `task` variable is set from with in the callback.
    task.perform(next => {
      task = next
      isResumed = true

      if (isBlocked) {
        run(next, onComplete)
      }
    })

    isBlocked = !isResumed

    return isResumed ? new Running(task) :
           new Blocked(task);
  }

  if (task instanceof Then || task instanceof Catch) {
    // Cast type cause flow is unable to derive it from
    // instanceof checks.
    var routine = new Running(task.task)
    while (routine instanceof Running) {
      routine = step(routine.task, onComplete)
    }

    if (routine instanceof Done) {
      var active = routine.task

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
      return routine
    }
  }

  return new Running(task)
}
