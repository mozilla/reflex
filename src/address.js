/* @flow */

/*::
import type {Task} from "./task";

export type Address <x, a> = (action: a) => Task<x, void>;
*/

export const send =/*::<x, a>*/(action/*:a*/, address/*:Address<x, a>*/)/*:Task<x, void>*/ =>
  address(action)

let GUID = 0

const anotator =/*::<x,a,b>*/(tag/*:(action:a)=>b*/, address/*:Address<x,b>*/)/*:Address<x,a>*/ =>
  (action/*:a*/) => address(tag(action))

export const forward =/*::<x,a,b>*/(tag/*:(action:a)=>b*/, address/*:Address<x,b>*/)/*:Address<x,a>*/ => {
  var id = address.id != null ? address.id :
            (address.id = GUID++);
  var key = `forward@${id}`;

  return tag[key] ||
         (tag[key] = anotator(tag, address));
};
