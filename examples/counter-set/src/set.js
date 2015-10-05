/* @flow */

import * as CounterList from "./list";
import * as Counter from "./counter";
import {html, forward, thunk} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type ID = number;
export type Entry = CounterList.Entry;
export type Model = CounterList.Model;
*/

export const create = ({nextID, entries}/*:Model*/)/*:Model*/ =>
  ({nextID, entries});

// Update

/*::
export type RemoveByID = {$typeof: "RemoveByID", id: ID}
export type Action = RemoveByID|CounterList.Action
*/


export const removeForID = (id/*:ID*/)/*:()=>RemoveByID*/ => () =>
  ({$typeof: "RemoveByID", id})

export const removeByID = (model/*:Model*/, id/*:ID*/)/*:Model*/ =>
  create({
    nextID: model.nextID,
    entries: model.entries.filter(entry => entry.id != id)
  })

export const update = (model/*:Model*/, action/*:Action*/)/*:Model*/ =>
  action.$typeof === 'RemoveByID'
    ?
      removeByID(model, action.id)
    :
      CounterList.update(model, action)


// View
const viewEntry = ({id, model}/*:Entry*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: id}, [
    Counter.view(model, forward(address, CounterList.by(id))),
    html.button({
      key: 'remove',
      onClick: forward(address, removeForID(id))
    }, 'x')
  ])

export const view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: 'CounterList'}, [
    html.div({key: 'controls'}, [
      html.button({
        key: "add",
        onClick: forward(address, CounterList.AddAction)
      }, ["Add"])
    ]),
    html.div({
      key: "entries"
    }, model.entries.map(entry => thunk(String(entry.id),
                                        viewEntry,
                                        entry,
                                        address)))
  ])
