/* @flow */

import * as Counter from "./counter";
import {html, forward, thunk} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type ID = number;
export type Entry = {
  id: ID,
  model: Counter.Model
};

export type Model = {
  nextID: ID,
  entries: Array<Entry>
};
*/

export const create = ({nextID, entries}/*:Model*/)/*:Model*/ =>
  ({nextID, entries});

// Update

/*::
export type Add = {$typeof: "Add"}
export type Remove = {$typeof: "Remove"}
export type ModifyByID = {$typeof: "ByID", id: ID, act: Counter.Action}

export type Action = Add|Remove|ModifyByID
*/


export const AddAction = ()/*:Add*/ => ({$typeof: "Add"})
export const RemoveAction = ()/*:Remove*/ => ({$typeof: "Remove"})
export const by = (id/*:ID*/)/*:(act:Counter.Action)=>ModifyByID*/ =>
  act => ({$typeof: "ByID", id, act});


export const add = (model/*:Model*/)/*:Model*/ =>
  create({
    nextID: model.nextID + 1,
    entries: model.entries.concat([{
      id: model.nextID,
      model: Counter.create({value: 0})
    }])
  })

export const remove = (model/*:Model*/)/*:Model*/ =>
  create({
    nextID: model.nextID,
    entries: model.entries.slice(1)
  })

export const modify = (model/*:Model*/, id/*:ID*/, action/*:Counter.Action*/)/*:Model*/ =>
  create({
    nextID: model.nextID,
    entries: model.entries.map(entry =>
      entry.id === id
        ?
          {id: id, model: Counter.update(entry.model, action)}
        :
          entry)
    })

export const update = (model/*:Model*/, action/*:Action*/)/*:Model*/ =>
  action.$typeof === 'Add'
    ?
      add(model, action)
    :
  action.$typeof === 'Remove'
    ?
      remove(model, action)
    :
  action.$typeof === 'ByID'
    ?
      modify(model, action.id, action.act)
    :
      model;


// View
const viewEntry = ({id, model}/*:Entry*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: id}, [
    Counter.view(model, forward(address, by(id)))
  ])

export const view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: 'CounterList'}, [
    html.div({key: 'controls'}, [
      html.button({
        key: "remove",
        onClick: forward(address, RemoveAction)
      }, ["Remove"]),
      html.button({
        key: "add",
        onClick: forward(address, AddAction)
      }, ["Add"])
    ]),
    html.div({
      key: "entries"
    }, model.entries.map(entry => thunk(String(entry.id),
                                        viewEntry,
                                        entry,
                                        address)))
  ])
