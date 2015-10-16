/* @flow */

import {RootNode} from "./dom";
import {succeed} from "./task";
import {mailbox, map, reductions} from "./signal";
import {none, nofx} from "./effects";
/*::
import * as type from "../type/application";
*/


const first = (xs/*:Array<any>*/) => xs[0]
const second = (xs/*:Array<any>*/) => xs[1]

const nostep = (model/*:any*/, _) => [model, none]

export const start/*:type.start*/ = configuration => {
  const {initial, view, update, step} = configuration
  const {address, signal} = mailbox()

  const advance = update != null ? nofx(update) :
                  step != null ? step :
                  nostep

  // Initial could be model if NoFXConfiguration is used or
  // `[model, effect]` if FXConfiguration is used. Flow can't really
  // derive from `update != null` that it's `NoFXConfiguration` so instead of
  // doing `[initial, none]` we concat insetad. If `FXConfiguration` is used
  // and type checker is not used user still could pass `[model]` so we normilize
  // that via concat again.
  // TODO: Probably we should just have a version of `start` that is for nofx.
  const base = [].concat(initial, [none])

  // This odd `nostep` function is only to workaround flowtype.org limitation.
  // For details see: https://github.com/facebook/flow/issues/891
  if (advance === nostep) {
    throw TypeError('start must be passed either step or update function')
  } else {
    const next = ([model, _], action) =>
      action != null ? advance(model, action) :
      [model, none];

    const display = (model) =>
      new RootNode(view, model, address)

    const steps = reductions(next, base, signal)
    const model = map(first, steps)

    return {
      address,
      model,
      task: map(second, steps),
      view: map(display, model)
    }
  }
}
