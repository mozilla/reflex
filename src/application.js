/* @flow */

import {Task} from "./task"
import {mailbox, map, reductions} from "./signal"
import {Effects} from "./effects"
import {root} from "./dom"

/*::
import type {Mailbox, Signal} from "./signal"
import type {BeginnerConfiguration, AdvancedConfiguration, Application} from "./application"
*/

const first = /*::<a, b>*/ (xs/*:[a, b]*/)/*:a*/ => xs[0]
const second = /*::<a, b>*/ (xs/*:[a, b]*/)/*:b*/ => xs[1]


export const beginner = /*::<model, action>*/
  (configuration/*:BeginnerConfiguration<model, action>*/)/*:AdvancedConfiguration<model, action, void>*/ =>
  ( { flags: void(0)
    , init: _ =>
      [ configuration.model
      , Effects.none
      ]
    , update: (model, action) =>
      [ configuration.update(model, action)
      , Effects.none
      ]
    , view: configuration.view
    }
  )

export const start = /*::<model, action, flags>*/
  (configuration/*:AdvancedConfiguration<model, action, flags>*/)/*:Application<model, action>*/ => {
    const {init, view, update, flags} = configuration
    // We don't have a value of `action` type there for we can not
    // create a `Mailbox<action>`. Elm works around that by defining
    // Mailbox<Array<action>> and starts with `[]`, but boxing every action
    // is hard to justify just to make type system happy. So instead we just
    // start with `null`.
    // @FlowIgnore:
    const {address, signal} = mailbox(({}/*:action*/))
    const step =
      ( [model, _]
      , action
      ) =>
      update(model, action)

    const display =
      (model) =>
      root(view, model, address)

    const steps =
      reductions(step, init(flags), signal)

    const model = map(first, steps)
    const application =
      { address
      , model
      , task: map(second, steps)
      , view: map(display, model)
      }

    return application
  }
