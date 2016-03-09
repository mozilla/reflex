/* @flow */


/*::
import type {Address, Signal, Mailbox} from "./signal"
import type {Translate, Reducer, AddressBook} from "./signal"

export type {Signal, Address, Mailbox}
export type {Translate, Reducer, AddressBook}
*/

class Input /*::<a>*/ {
  /*::
  $type: "Signal.Signal";
  value: a;
  addressBook: ?AddressBook<a>;
  isBlocked: boolean;
  queue: ?Array<a>;
  address: ?Address<a>;
  */
  static Address /*::<message>*/(signal/*:Input<message>*/)/*:Address<message>*/{
    if (signal.address == null) {
      signal.address = signal.receive.bind(signal)
      // TODO: Submit a bug for flow as return here and else clause is
      // redundunt.
      return signal.address
    } else {
      return signal.address
    }
  }
  static notify(message/*:a*/, addressBook/*:AddressBook<a>*/, from/*:number*/, to/*:number*/)/*:void*/ {
    try {
      while (from < to) {
        const address = addressBook[from]
        if (address != null) {
          address(message)
        }
        from = from + 1
      }
    } finally {
      if (from < to) {
        Input.notify(message, addressBook, from + 1, to)
      }
    }
  }
  static connect(signal/*:Input<a>*/, address/*:Address<a>*/) {
    if (signal.addressBook == null) {
      signal.addressBook = [address]
    } else {
      // TODO: Submit a flow bug that seems to occur if observers aren't copyied
      // presumably because it assumes that `this.observer.indexOf(observer)`
      // may mutate this.
      const addressBook = signal.addressBook
      if (addressBook.indexOf(address) < 0) {
        addressBook.push(address)
      }
    }
  }
  constructor(value/*:a*/) {
    this.value = value
    this.isBlocked = false

    this.addressBook = null
    this.queue = null
    this.address = null
  }
  receive(value/*:a*/) {
    // If signal is blocked queue transaction to be processed once it is
    // unblocked.
    if (this.isBlocked) {
      if (this.queue == null) {
        this.queue = [value]
      } else {
        this.queue.push(value)
      }
    } else {
      this.isBlocked = true
      try {
        this.value = value

        if (this.addressBook != null) {
          const addressBook = this.addressBook
          Input.notify(value, addressBook, 0, addressBook.length)
        }
      } finally {
        this.isBlocked = false
        if (this.queue != null && this.queue.length > 0) {
          this.receive(value = this.queue.shift())
        }
      }
    }
  }
  subscribe(address/*:Address<a>*/)/*:void*/ {
    Input.connect(this, address)
    address(this.value)
  }
  connect(address/*:Address<a>*/) {
    if (this.addressBook == null) {
      this.addressBook = [address]
    } else {
      // TODO: Submit a flow bug that seems to occur if observers aren't copyied
      // presumably because it assumes that `this.observer.indexOf(observer)`
      // may mutate this.
      const addressBook = this.addressBook
      if (addressBook.indexOf(address) < 0) {
        addressBook.push(address)
      }
    }
  }
}
Input.prototype.$type = "Signal.Signal"

class Inbox /*::<message>*/ {
  /*::
  $type: "Signal.Mailbox";
  signal: Signal<message>;
  address: Address<message>;
  */
  constructor(message/*:message*/) {
    this.signal = new Input(message)
    this.address = Input.Address(this.signal)
  }
}
Inbox.prototype.$type = "Signal.Mailbox"

export const mailbox = /*::<message>*/
  (message/*:message*/)/*:Mailbox<message>*/ =>
  new Inbox(message)


const Forward = /*::<a,b>*/
  ( address/*:Address<b>*/
  , tag/*:(a:a)=>b*/
  )/*:Address<a>*/ => {
    const forward = (message/*:a*/) => address(tag(message))
    forward.to = address
    forward.tag = tag
    return forward
  }

if (global['reflex/address'] == null) {
  global['reflex/address'] = 0
}

// Create a new address. This address will tag each message it receives and then
// forward it along to the given address.
// Example:
//
// const Remove = target => {type: "Remove", target}
// removeAddress = forward(address, Remove)
//
// Above example created `removeAddress` tags each message with `Remove` tag
// before forwarding them to a general `address`.
export const forward = /*::<a, b>*/
  ( address/*:Address<a>*/
  , tag/*:Translate<b, a>*/
  )/*:Address<b>*/ => {
    // Genrate ID for each address that has a forwarding addresses so that
    // forwarding addresses could be cached by that id and a tag-ing function.
    const id = address.id != null ? address.id :
               (address.id = global['reflex/address']++);
    const key = `reflex/address/${id}`

    return tag[key] || (tag[key] = Forward(address, tag))
  }


export const reductions = /*::<state, input>*/
  ( step/*:Reducer<state, input>*/
  , state/*:state*/
  , input/*:Signal<input>*/
  )/*:Signal<state>*/ => {
    const output = new Input(state)
    input.connect(forward(Input.Address(output),
                          value => step(output.value, value)))
  return output
}

export const map = /*::<a, b>*/
  ( f/*:Translate<a, b>*/
  , input/*:Signal<a>*/
  )/*:Signal<b>*/ => {
    const output = new Input(f(input.value))
    input.connect(forward(Input.Address(output), f))
    return output
  }
