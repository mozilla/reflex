/* @flow */

import { Effects } from "./effects"
import type { Address } from "./signal"

type Tagger<a, b> = (value: a) => b

export interface Subscriber<info, inn, out> {
  detail: info,
  tagger: Tagger<inn, out>
}

export type Service<message, out, inn, model, info> = {
  inbox: Address<inn>,
  subscribers: Array<Subscriber<info, out, message>>,
  state: model,
  feed: Feed<out, inn, model, info>
}

export interface Feed<out, inn, model, info> {
  address?: string,
  init(): model,
  subscribe<message>(subscribers: Array<Subscriber<info, out, message>>): inn,
  update<message>(
    state: model,
    input: inn,
    outbox: Address<message>
  ): [model, Effects<inn>]
}

export class Subscription<a> {
  static none: Subscription<*>
  static batch(subscriptions: Array<Subscription<a>>): Subscription<a> {
    return new Batch(subscriptions)
  }
  map<b>(tag: (value: a) => b): Subscription<b> {
    return this.map(tag)
  }
  reduce<state>(
    reducer: (result: state, input: Subscribe<a, *, *, *, *>) => state,
    init: state
  ): state {
    return init
  }
}

export class Subscribe<out, inn, msg, model, info> extends Subscription<out>
  implements Subscriber<info, inn, out> {
  feed: Feed<inn, msg, model, info>
  detail: info
  tagger: Tagger<inn, out>

  constructor(
    feed: Feed<inn, msg, model, info>,
    detail: info,
    tagger: Tagger<inn, out>
  ) {
    super()
    this.feed = feed
    this.detail = detail
    this.tagger = tagger
  }
  map<b>(tag: (value: out) => b): Subscription<b> {
    const decoder = (value: inn): b => tag(this.tagger(value))
    return new Subscribe(this.feed, this.detail, decoder)
  }
  reduce<state>(
    reducer: (
      result: state,
      input: Subscribe<out, inn, msg, model, info>
    ) => state,
    init: state
  ): state {
    return reducer(init, this)
  }
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
    reducer: (result: state, input: Subscribe<a, *, *, *, *>) => state,
    init: state
  ): state {
    return this.subscriptions.reduce(
      (result: state, subscription: Subscription<a>): state =>
        subscription.reduce(reducer, result),
      init
    )
  }
  subscriptions: Array<Subscription<a>>
}

export const subscribe = <outer, inner, message, model, info>(
  feed: Feed<inner, message, model, info>,
  detail: info,
  tagger: Tagger<inner, outer>
): Subscription<outer> => new Subscribe(feed, detail, tagger)

const none: Subscription<any> = new Batch([])
export const unsubscribe = <a>(_: mixed): Subscription<a> => none
Subscription.none = none
