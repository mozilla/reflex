/* @flow */

import { Effects } from "./Effects"

type Decoder<a> = (value: mixed) => a

export type Service<message, action, model> = {
  subscriptions: Array<Subscription<message>>,
  state: model,
  feed: Feed<message, action, model>
}

export interface Feed<message, action, model> {
  init(): model,
  subscribe(subscribers: Array<action>): action,
  update(state: model, payload: action): [model, Effects<message>],
  address?: string
}

class Subscription<a> {
  map<b>(tag: (value: a) => b): Subscription<b> {
    return this.map(tag)
  }
  reduce<state>(
    reducer: (result: state, input: Subscribe<a, any, any, any>) => state,
    init: state
  ): state {
    return init
  }
}

class Subscribe<a, info, model, message> extends Subscription<a> {
  constructor(
    feed: Feed<info, model, message>,
    detail: info,
    decoder: Decoder<a>
  ) {
    super()
    this.feed = feed
    this.detail = detail
    this.decoder = decoder
  }
  map<b>(tag: (value: a) => b): Subscription<b> {
    const decoder = (value: mixed) => tag(this.decoder(value))
    return new Subscribe(this.feed, this.detail, decoder)
  }
  reduce<state>(
    reducer: (
      result: state,
      input: Subscribe<a, info, model, message>
    ) => state,
    init: state
  ): state {
    return reducer(init, this)
  }

  feed: Feed<info, model, message>
  detail: info
  decoder: Decoder<a>
}

class Batch<a> extends Subscription<a> {
  constructor(subscriptions: Array<Subscription<a>>) {
    super()
    this.subscriptions = subscriptions
  }
  map<b>(tag: (value: a) => b): Subscription<b> {
    const subscriptions = this.subscriptions.map($ => $.map(tag))
    return new Batch(subscriptions)
  }
  reduce<state>(
    reducer: (result: state, input: Subscribe<a, any, any, any>) => state,
    init: state
  ): state {
    return this.subscriptions.reduce(
      (state, subscription) => subscription.reduce(reducer, state),
      init
    )
  }
  subscriptions: Array<Subscription<a>>
}

export const subscription = <info, model, message, a>(
  feed: Feed<info, model, message>,
  detail: info,
  decoder: Decoder<a>
): Subscription<a> => new Subscribe(feed, detail, decoder)

export const batch = <a>(
  subscriptions: Array<Subscription<a>>
): Subscription<a> => new Batch(subscriptions)

export const none: Subscription<any> = new Batch([])
export type { Subscription }
