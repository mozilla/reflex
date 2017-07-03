/* @flow */

export type Address<a> = (input: a) => void

const Forward = <a, b>(address: Address<b>, tag: (a: a) => b): Address<a> => {
  const forward = (message: a) => address(tag(message))
  forward.to = address
  forward.tag = tag
  return forward
}

if (global["reflex/address"] == null) {
  global["reflex/address"] = 0
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
export const forward = <a, b>(
  address: Address<a>,
  tag: (value: b) => a
): Address<b> => {
  // Genrate ID for each address that has a forwarding addresses so that
  // forwarding addresses could be cached by that id and a tag-ing function.
  const id =
    address.id != null ? address.id : (address.id = global["reflex/address"]++)
  const key = `reflex/address/${id}`

  return tag[key] || (tag[key] = Forward(address, tag))
}
