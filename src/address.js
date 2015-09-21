/* @flow */

export const send =/*::<a>*/(action/*:a*/, address/*:(action:a)=>void*/)/*:void*/ =>
  address(action)
