import {Record, Union} from "typed-immutable";

export const Model = Record({value: Number});
export const Increment = Record({label: '+'});
export const Decrement = Record({label: '-'});
export const Action = Union(Increment, Decrement);

