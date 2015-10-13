import type {Address} from "./signal"

export type Task <x, a> = {
  $$typeof: "Reflex.Task",
  chain: <b>(next:(a:a) => Task<x,b>) => Task<x,b>,
  map: <b>(f:(a:a) => b) => Task<x,b>,
  catch: <y>(recover:(x:x) => Task<y,a>) => Task<y,a>
}


export type succeed <x,a> = (value:a) => Task<x,a>
export type fail <x,a> = (error:x) => Task<x,a>

type Request <x,a> = (respond:(task: Task<x,a>) => void) => void
export type io <x,a> = (perform:Request<x,a>) => Task<x,a>
export type future <x,a> = (request:() => Promise<a>) => Task<x,a>

export type chain <x,a,b>
  = (task:Task<x,a>, next:(value:a) => Task<x,b>) =>
    Task<x,b>

export type onError <x, y, a>
  = (task:Task<x,a>, recover:(error:x) => Task<y,a>) =>
    Task<y,a>

export type ThreadID = number;

export type spawn <x, y, a> = (task: Task<x,a>) => Task<y, ThreadID>

export type sleep <x> = (time:number) => Task<x,void>

export type perform <x,a> = (task:Task<x,a>) => void

export type execute <x,a> = (task:Task<x,a>, onComplete:() => void) => void

export type Routine
  = {$$typeof: "Done", task: Task<any,any>}
  & {$$typeof: "Running", task: Task<any,any>}
  & {$$typeof: "Blocked", task: Task<any,any>}

export type run <x,a> = (routine:Routine, onComplete:() => void) => void

export type send <x, a> = (address:Address<a>, action:a) =>
  Task<x, void>
