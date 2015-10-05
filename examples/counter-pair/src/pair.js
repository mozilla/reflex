/* @flow */
import * as Counter from "./counter";
import {html, forward} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type Model = {top: Counter.Model; bottom: Counter.Model};
export type Top = {$typeof: 'Top', act: Counter.Action};
export type Bottom = {$typeof: 'Bottom', act: Counter.Action};
export type Reset = {$typeof: 'Reset'};
export type Action = Reset|Top|Bottom;
*/


export const ModifyTop = (act/*:Counter.Action*/)/*:Top*/ =>
  ({$typeof: "Top", act})

export const ModifyBottom = (act/*:Counter.Action*/)/*:Bottom*/ =>
  ({$typeof: "Bottom", act})

export const Clear = ()/*:Reset*/ =>
  ({$typeof: "Reset" })


const set = /*::<T>*/(record/*:T*/, field/*:string*/, value/*:any*/)/*:T*/ => {
  const result = Object.assign({}, record)
  result[field] = value
  return result
}

export const create = ({top, bottom}/*:Model*/)/*:Model*/ => ({
  top: Counter.create(top),
  bottom: Counter.create(bottom)
})

export const update = (model/*:Model*/, action/*:Action*/)/*:Model*/ =>
  action.$typeof === 'Top' ?
    set(model, 'top', Counter.update(model.top, action.act)) :
  action.$typeof === 'Bottom' ?
    set(model, 'bottom', Counter.update(model.bottom, action.act)) :
  action.$typeof === 'Reset' ?
    create({top: {value: 0},
            bottom: {value: 0}}) :
  model

// View
export var view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ => {
  return html.div({key: 'counter-pair'}, [
    html.div({key: 'top'}, [
      Counter.view(model.top, forward(address, ModifyTop))
    ]),
    html.div({key: 'bottom'}, [
      Counter.view(model.bottom, forward(address, ModifyBottom)),
    ]),
    html.div({key: 'controls'}, [
      html.button({
        key: 'reset',
        onClick: forward(address, Clear)
      }, ["Reset"])
    ])
  ]);
};
