/* @flow */

import type {Address} from "./signal"
import task from "./task"

export type Never = {$$typeof: "Effects.Never"}

export type None = {
  $$typeof: "Effects.None",
  map: <message, tagged>(tag:(value:message) => tagged) => None,
  send: <message> (address:Address<message>) => task.Task<Never, void>
}

export type Tick <message> = {
  $$typeof: "Effects.Tick",
  map: <tagged>(tag:(value:message) => tagged) => Tick<tagged>,
  send: (address:Address<message>) => task.Task<Never, void>
}

export type Task <message> = {
  $$typeof: "Effects.Job",
  map: <tagged>(tag:(value:message) => tagged) => Task<tagged>,
  send: (address:Address<message>) => task.Task<Never, void>
}

export type Batch <message> = {
  $$typeof: "Effects.Batch",
  map: <tagged>(tag:(value:message) => tagged) => Batch<tagged>,
  send: (address:Address<message>) => task.Task<Never, void>
}

export type Effects <message>
  = None
  | Task<message>
  | Tick <message>
  | Batch <message>

export type none = None

export type job <a>
  = (task:task.Task<Never, a>) => Effects<a>

export type tick <a>
  = (tag:(time:number) => a) => Effects<a>

export type batch <a>
  = (tasks:Array<Effects<a>>) => Effects<a>

export type nofx <model, action>
  = (update:(state:model, message:action) => model) =>
      (state:model, message:action) => [model, Effects<action>]

export type service <action>
  = (address:Address<action>) =>
      (fx:Effects<action>) => void
