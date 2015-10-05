/* @flow */
import * as RandomGif from "./random-gif";
import {html, forward, Task, Effects} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type Model = {
  left: RandomGif.Model,
  right: RandomGif.Model
};
*/

export const create = ({left, right}/*:Model*/)/*:Model*/ => ({
  left: RandomGif.create(left),
  right: RandomGif.create(right)
})

export const initialize = (leftTopic/*:string*/, rightTopic/*:string*/)/*:[Model, Effects<Action>]*/ => {
  const [left, leftFx] = RandomGif.initialize(leftTopic)
  const [right, rightFx] = RandomGif.initialize(rightTopic)
  return [
    {left, right},
    Effects.batch([
      leftFx.map(LeftAction),
      rightFx.map(RightAction)
    ])
  ]
}

/*::
export type Left = {$typeof: 'Left', act: RandomGif.Action};
export type Right = {$typeof: 'Right', act: RandomGif.Action};
export type Action = Left|Right;
*/


export const LeftAction = (act/*:RandomGif.Action*/)/*:Left*/ =>
  ({$typeof: "Left", act})

export const RightAction = (act/*:RandomGif.Action*/)/*:Right*/ =>
  ({$typeof: "Right", act})


export const step = (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ => {
  if (action.$typeof === "Left") {
    const [left, fx] = RandomGif.step(model.left, action.act)
    return [create({left, right: model.right}), fx.map(LeftAction)]
  }
  if (action.$typeof === "Right") {
    const [right, fx] = RandomGif.step(model.right, action.act)
    return [create({left:model.left, right}), fx.map(RightAction)]
  }

  return [model, Effects.none]
}

// View
export var view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ => {
  return html.div({key: "random-gif-pair",
                   style: {display: "flex"}}, [
    html.div({key: 'left'}, [
      RandomGif.view(model.left, forward(address, LeftAction))
    ]),
    html.div({key: 'right'}, [
      RandomGif.view(model.right, forward(address, RightAction))
    ])
  ]);
};
