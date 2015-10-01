/* @flow */

import {thunk} from "./core";
import {succeed} from "./task";
import {mailbox, map, reductions} from "./signal";
import {none, nofx} from "./effects";
/*::
import type {VirtualElement} from "./core";
import type {Address, Signal} from "./signal";
import type {Task} from "./task";
import type {Effects, Never} from "./effects";
*/


/*::
type Step <model,action> = [model,Effects<action>];

type FXConfiguration <model,action> = {
  initial: Step<model,action>;
  step: (state:model, message:action) => Step<model, action>;
  update: void;
  view: (state:model, address:Address<action>) => VirtualElement;
}

type NoFXConfiguration <model,action> = {
  initial: Step<model,action>;
  update: (state:model, message:action) => model;
  step: void;
  view: (state:model, address:Address<action>) => VirtualElement;
}

type Configuration<model, action>
  = FXConfiguration<model, action>
  | NoFXConfiguration<model, action>;

type Application <model,action> = {
  address: Address<action>;
  model: Signal<model>;
  view: Signal<VirtualElement>;
  task: Signal<Effects<action>>;
}


*/

const first = (xs/*:Array<any>*/) => xs[0]
const second = (xs/*:Array<any>*/) => xs[1]

const nostep = (model/*:any*/, _) => [model, none]

export const start = /*::<model,action>*/(configuration/*:Configuration<model,action>*/)/*:Application<model,action>*/ => {
  const {initial, view, update, step} = configuration
  const {address, signal} = mailbox()

  const advance = update != null ? nofx(update) :
                  step != null ? step :
                  nostep

  // This odd `nostep` function is only to workaround flowtype.org limitation.
  // For details see: https://github.com/facebook/flow/issues/891
  if (advance === nostep) {
    throw TypeError('start must be passed either step or update function')
  } else {
    const next = ([model, _]/*:Step<model,action>*/, action/*:?action*/)/*:Step<model,action>*/ =>
      action != null ? advance(model, action) :
      [model, none];

    const display = (model/*:model*/) =>
      thunk('/', view, model, address)

    const steps = reductions(next, initial, signal)
    const model = map(first, steps)

    return {
      address,
      model,
      task: map(second, steps),
      view: map(display, model)
    }
  }
}
