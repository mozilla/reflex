/* @flow */

import {thunk} from "./core";
import {succeed} from "./task";
import {mailbox, map, reductions} from "./signal";
import {none} from "./effects";
/*::
import type {VirtualElement} from "./core";
import type {Address, Signal} from "./signal";
import type {Task} from "./task";
import type {Effects, Never} from "./effects";
*/


/*::
type Step <model,action> = [model,Effects<action>];

type Configuration <model,action> = {
  initial: Step<model,action>;
  update: (state:model, message:action) => Step<model, action>;
  view: (state:model, address:Address<action>) => VirtualElement;
}

type Application <model,action> = {
  address: Address<action>;
  model: Signal<model>;
  view: Signal<VirtualElement>;
  task: Signal<Effects<action>>;
}


*/

const first = (xs/*:Array<any>*/) => xs[0]
const second = (xs/*:Array<any>*/) => xs[1]

export const start = /*::<model,action>*/(configuration/*:Configuration<model,action>*/)/*:Application<model,action>*/ => {
  const {initial, update, view} = configuration
  const {address, signal} = mailbox()

  const step = ([model, _]/*:Step<model,action>*/, action/*:?action*/)/*:Step<model,action>*/ =>
    action != null ? update(model, action) :
    [model, none];

  const display = (model/*:model*/) =>
    thunk('/', view, model, address)

  const steps = reductions(step, initial, signal)
  const model = map(first, steps)

  return {
    address,
    model,
    task: map(second, steps),
    view: map(display, model)
  }
}
