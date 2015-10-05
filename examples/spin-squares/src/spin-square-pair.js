/* @flow */
import * as SpinSquare from "./spin-square";
import {html, forward, thunk, Effects} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type Model = {
  left: SpinSquare.Model,
  right: SpinSquare.Model
};
*/

export const create = ({left, right}/*:Model*/)/*:Model*/ => ({
  left: SpinSquare.create(left),
  right: SpinSquare.create(right)
})

export const initialize = ()/*:[Model, Effects<Action>]*/ => {
  const [left, leftFx] = SpinSquare.initialize()
  const [right, rightFx] = SpinSquare.initialize()
  return [
    {left, right},
    Effects.batch([
      leftFx.map(LeftAction),
      rightFx.map(RightAction)
    ])
  ]
}

/*::
export type Left = {$typeof: 'Left', act: SpinSquare.Action};
export type Right = {$typeof: 'Right', act: SpinSquare.Action};
export type Action = Left|Right;
*/


export const LeftAction = (act/*:SpinSquare.Action*/)/*:Left*/ =>
  ({$typeof: "Left", act})

export const RightAction = (act/*:SpinSquare.Action*/)/*:Right*/ =>
  ({$typeof: "Right", act})


export const step = (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ => {
  if (action.$typeof === "Left") {
    const [left, fx] = SpinSquare.step(model.left, action.act)
    return [create({left, right: model.right}), fx.map(LeftAction)]
  }
  if (action.$typeof === "Right") {
    const [right, fx] = SpinSquare.step(model.right, action.act)
    return [create({left:model.left, right}), fx.map(RightAction)]
  }

  return [model, Effects.none]
}

// View
export var view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: "spin-square-pair",
                   style: {display: "flex"}}, [
    thunk("left", SpinSquare.view, model.left, forward(address, LeftAction)),
    thunk("right", SpinSquare.view, model.right, forward(address, RightAction))
  ])
