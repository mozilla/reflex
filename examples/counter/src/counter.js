/* @flow */
import {Record, Union} from "typed-immutable";
import {html, forward} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type Model = {value:number};
export type Increment = {$typeof: 'Increment'};
export type Decrement = {$typeof: 'Decrement'};
export type Action = Increment|Decrement;
*/


const set = /*::<T>*/(record/*:T*/, field/*:string*/, value/*:any*/)/*:T*/ => {
  const result = Object.assign({}, record)
  result[field] = value
  return result
}

export const create = ({value}/*:Model*/)/*:Model*/ => ({value})
export const Inc = ()/*:Increment*/ => ({$typeof: 'Increment'})
export const Dec = ()/*:Decrement*/ => ({$typeof: 'Decrement'})

export const update = (model/*:Model*/, action/*:Action*/)/*:Model*/ =>
  action.$typeof === 'Increment' ?
    set(model, 'value', model.value + 1) :
  action.$typeof === 'Decrement' ?
    set(model, 'value', model.value - 1) :
  model

const counterStyle = {
  value: {
    fontWeight: 'bold'
  }
}

// View
export var view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ => {
  return html.span({key: 'counter'}, [
    html.button({
      key: 'decrement',
      onClick: forward(address, Dec)
    }, ["-"]),
    html.span({
      key: 'value',
      style: counterStyle.value,
    }, [String(model.value)]),
    html.button({
      key: 'increment',
      onClick: forward(address, Inc)
    }, ["+"])
  ]);
};
