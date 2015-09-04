import {Record, Union} from "typed-immutable";
import {html} from "reflex";

export const Model = Record({value: Number});

export const Increment = Record({label: '+'});
export const Decrement = Record({label: '-'});
export const Action = Union(Increment, Decrement);

// Update
export const update = (model, action) =>
  action instanceof Increment ? model.update('value', x => x + 1) :
  action instanceof Decrement ? model.update('value', x => x - 1) :
  model;

const counterStyle = {
  value: {
    fontWeight: 'bold'
  }
};

// View
export const view = (model, address) => {
  return html.span({key: 'counter'}, [
    html.button({
      key: 'decrement',
      onClick: address.pass(Decrement)
    }, ["-"]),
    html.span({
      key: 'value',
      style: counterStyle.value,
    }, [String(model.value)]),
    html.button({
      key: 'increment',
      onClick: address.pass(Increment)
    }, ["+"])
  ]);
};
