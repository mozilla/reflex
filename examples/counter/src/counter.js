import {Record, Union} from "typed-immutable";
import {html, forward, Effects} from "reflex";
/*::
import type {Task, Address, VirtualElement} from "reflex"
*/

/*::
type Counter = {value: number};
type create = (data: {value:number}) => Counter;
*/
export var Model/*:create*/ = Record({value: Number});

/*::
type Inc = {label: '+'};
type Dec = {label: '-'};
type Act = Inc|Dec;
*/

export var Increment/*:(x:Inc)=>Inc*/= Record({label: '+'});
export var Decrement/*:(x:Dec)=>Dec*/= Record({label: '-'});
export var Action/*:(x:Act)=>Act*/=Union(Increment, Decrement);

export var update = (model/*:Counter*/, action/*:Act*/)/*:[Counter, Task<any,Act>]*/ =>
  action instanceof Increment ?
    [model.update('value', x => x + 1), Effects.none] :
  action instanceof Decrement ?
    [model.update('value', x => x - 1), Effects.none] :
    [model, Effects.none];

var counterStyle = {
  value: {
    fontWeight: 'bold'
  }
};

// View
export var view = (model/*:Counter*/, address/*:Address<Act>*/)/*:VirtualElement*/ => {
  return html.span({key: 'counter'}, [
    html.button({
      key: 'decrement',
      onClick: forward(Decrement, address)
    }, ["-"]),
    html.span({
      key: 'value',
      style: counterStyle.value,
    }, [String(model.value)]),
    html.button({
      key: 'increment',
      onClick: forward(Increment, address)
    }, ["+"])
  ]);
};
