/* @flow */


/*::
import * as type from "../type/signal"
*/

export class Signal /*::<a>*/ {
  /*::
  $$typeof: "Signal.Signal";
  value: a;
  addressBook: ?type.AddressBook<a>;
  isBlocked: boolean;
  queue: ?Array<a>;
  address: ?type.Address<a>;
  */
  static Address /*::<message>*/(signal/*:Signal<message>*/)/*:type.Address<message>*/{
    if (signal.address == null) {
      signal.address = signal.receive.bind(signal)
      // TODO: Submit a bug for flow as return here and else clause is
      // redundunt.
      return signal.address
    } else {
      return signal.address
    }
  }
  static notify(message/*:a*/, addressBook/*:type.AddressBook<a>*/, from/*:number*/, to/*:number*/)/*:void*/ {
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
        Signal.notify(message, addressBook, from + 1, to)
      }
    }
  }
  static connect(signal/*:Signal<a>*/, address/*:type.Address<a>*/) {
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
          Signal.notify(value, addressBook, 0, addressBook.length)
        }
      } finally {
        this.isBlocked = false
        if (this.queue != null && this.queue.length > 0) {
          this.receive(value = this.queue.shift())
        }
      }
    }
  }
  subscribe(address/*:type.Address<a>*/)/*:void*/ {
    Signal.connect(this, address)
    address(this.value)
  }
  connect(address/*:type.Address<a>*/) {
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
Signal.prototype.$$typeof = "Signal.Signal"

class Mailbox /*::<message>*/ {
  /*::
  $$typeof: "Signal.Mailbox";
  signal: type.Signal<message>;
  address: type.Address<message>;
  */
  constructor(message/*:message*/) {
    this.signal = new Signal(message)
    this.address = Signal.Address(this.signal)
  }
}
Mailbox.prototype.$$typeof = "Signal.Mailbox"

export const mailbox/*:type.mailbox*/ = message =>
  new Mailbox(message)


const Forward =/*::<a,b>*/(address/*:type.Address<b>*/, tag/*:(a:a)=>b*/)/*:type.Address<a>*/ => {
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
export const forward/*:type.forward*/ = (address, tag) => {
  // Genrate ID for each address that has a forwarding addresses so that
  // forwarding addresses could be cached by that id and a tag-ing function.
  const id = address.id != null ? address.id :
             (address.id = global['reflex/address']++);
  const key = `reflex/address/${id}`

  return tag[key] || (tag[key] = Forward(address, tag))
}


export const reductions/*:type.reductions*/ = (step, state, input) => {
  const output = new Signal(state)
  input.connect(forward(Signal.Address(output),
                        value => step(output.value, value)))
  return output
}

export const map/*:type.map*/ = (f, input) => {
  const output = new Signal(f(input.value))
  input.connect(forward(Signal.Address(output), f))
  return output
}
