/* @flow */

export type Address <message> = (msg:message) => void
export type AddressBook <message> = Array<Address<message>>

export type Signal <message> = {
  subscribe:(address:Address<message>) => void
}

export type Mailbox <message> = {
  address: Address<message>,
  signal: Signal<message>
}

export type mailbox <message> = (message:message) =>
  Mailbox<message>

type Tag <message,tagged> = (message:message) => tagged

export type forward <a,b> = (address:Address<b>, tag:Tag<a,b>) =>
  Address<a>

export type Step <model, action> = (state:model, message:action) =>
  model

export type reductions <model, action>
  = (step:Step<model, action>, state:model, input:Signal<action>) =>
    Signal<model>

export type map <message, tagged>
  = (f:(message:message) => tagged, input:Signal<message>) =>
    Signal<tagged>
