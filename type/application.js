/* @flow */

import type {ChildNode, RootNode} from "./index"
import type {Address, Signal, Mailbox} from "./signal"
import type {Task} from "./task"
import type {Effects, Never} from "./effects"

export type Step <model, action> = [model, Effects<action>]

export type FXConfiguration <model, action> = {
  initial: Step<model, action>,
  step: (state:model, message:action) => [model, Effects<action>],
  view: (state:model, address:Address<action>) => RootNode
}

export type NoFXConfiguration <model, action> = {
  initial: model,
  update: (state:model, message:action) => model,
  view: (state:model, address:Address<action>) => RootNode
}

export type Configuration <model, action>
  = FXConfiguration<model, action>
  | NoFXConfiguration<model, action>

export type Application <model, action> = {
  address: Address<action>,
  model: Signal<model>,
  view: Signal<RootNode>,
  task: Signal<Effects<action>>
}

export type start <model, action>
  = (configuration:Configuration) => Application<model, action>
