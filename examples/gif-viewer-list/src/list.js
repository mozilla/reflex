/* @flow */
import * as RandomGif from "./random-gif";
import {html, forward, thunk, Effects} from "reflex";

/*::
import type {Address} from "reflex/src/signal";
import type {VirtualElement} from "reflex/src/core";

export type ID = number

export type Entry = {
  id: ID,
  model: RandomGif.Model
}

export type Model = {
  topic: string,
  entries: Array<Entry>,
  nextID: ID
}
*/

export const create = ({topic, entries, nextID}/*:Model*/)/*:Model*/ =>
  ({topic, entries, nextID})

export const initialize = ()/*:[Model, Effects<Action>]*/ =>
  [create({topic: "", entries: [], nextID: 0}, Effects.none)]


/*::
export type Topic = {$typeof: "Topic", topic: string}
export type Create = {$typeof: "Create"}
export type UpdateByID = {$typeof: "UpdateByID", id: ID, act: RandomGif.Action}
export type Action
  = Topic
  | Create
  | UpdateByID
*/


export const TopicAction = (topic/*:string*/)/*:Topic*/ =>
  ({$typeof: "Topic", topic})

export const CreateAction = ()/*:Create*/=>
  ({$typeof: "Create"})

export const byID = (id/*:ID*/)/*:(action:RandomGif.Action)=>UpdateByID*/=>
  action => ({$typeof: "UpdateByID", id, act: action})

const find = Array.prototype.find != null ? (array, p) => array.find(p) :
             (array, p) => {
              let index = 0
              while (index < array.length) {
                if (p(array[index])) {
                  return array[index]
                }
                index = index + 1
              }
             }

export const step = (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ => {
  if (action.$typeof === "Topic") {
    return [
      {topic: action.topic, entries: model.entries, nextID: model.nextID},
      Effects.none
    ]
  }

  if (action.$typeof === "Create") {
    const [gif, fx] = RandomGif.initialize(model.topic)
    return [
      {
        topic: "",
        nextID: model.nextID + 1,
        entries: model.entries.concat([{id: model.nextID, model: gif}])
      },
      fx.map(byID(model.nextID))
    ]
  }

  if (action.$typeof === "UpdateByID") {
    const {id} = action
    const {entries, topic, nextID} = model
    const entry = find(entries, entry => entry.id === id)
    const index = entry != null ? entries.indexOf(entry) : -1
    if (index >= 0 && entry != null && entry.model != null && entry.id != null){
      const [gif, fx] = RandomGif.step(entry.model, action.act)
      const entries = model.entries.slice(0)
      entries[index] = {id, model: gif}

      return [
        {topic, nextID, entries},
        fx.map(byID(id))
      ]
    }
  }

  return [model, Effects.none]
}

const style = {
  input: {
    width: "100%",
    height: "40px",
    padding: "10px 0",
    fontSize: "2em",
    textAlign: "center"
  },
  container: {
    display: "flex",
    flexWrap: "wrap"
  }
}

// View
const viewEntry = ({id, model}/*:Entry*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  RandomGif.view(model, forward(address, byID(id)))

export const view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: "random-gif-list"}, [
    html.input({
      style: style.input,
      placeholder: "What kind of gifs do you want?",
      value: model.topic,
      onChange: forward(address, event => TopicAction(event.target.value)),
      onKeyUp: event => {
        if (event.key === 'Enter') {
          address(CreateAction())
        }
      }
    }),
    html.div({key: "random-gifs-list-box", style: style.container},
             model.entries.map(entry => thunk(String(entry.id),
                                              viewEntry,
                                              entry,
                                              address)))
  ])
