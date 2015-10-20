/* @flow */

import type {Address} from "./signal"
import {TaskType} from "./task"

export type Never = {$type: "Effects.Never"}

export type None = {
  $type: "Effects.None",
  map: <message, tagged>(tag:(value:message) => tagged) => None,
  send: <message> (address:Address<message>) => TaskType<Never, void>
}

export type Tick <message> = {
  $type: "Effects.Tick",
  tag: (time:number) => message,
  map: <tagged>(tag:(value:message) => tagged) => Tick<tagged>,
  send: (address:Address<message>) => TaskType<Never, void>
}

export type Task <message> = {
  $type: "Effects.Task",
  task: TaskType<Never, message>,
  map: <tagged>(tag:(value:message) => tagged) => Task<tagged>,
  send: (address:Address<message>) => TaskType<Never, void>
}

export type Batch <message> = {
  $type: "Effects.Batch",
  effects: TaskType<Effects<message>>,
  map: <tagged>(tag:(value:message) => tagged) => Batch<tagged>,
  send: (address:Address<message>) => TaskType<Never, void>
}

export type Effects <message>
  = None
  | Task<message>
  | Tick <message>
  | Batch <message>

export type none = None

export type task <a>
  = (task:TaskType<Never, a>) => Task<a>

export type tick <a>
  = (tag:(time:number) => a) => Tick<a>

export type batch <a>
  = (effects:Array<Effects<a>>) => Batch<a>

export type nofx <model, action>
  = (update:(state:model, message:action) => model) =>
      (state:model, message:action) => [model, Effects<action>]

export type service <action>
  = (address:Address<action>) =>
      (fx:Effects<action>) => void
