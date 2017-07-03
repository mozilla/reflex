/* @flow */

import { Task } from "./task"
import { Effects } from "./effects"
import { LazyRoot } from "./dom"
import { Node } from "reflex-driver"
import type { Address } from "./signal"
import { Subscription, Feed, unsubscribe } from "./subscription"
import type { Service, Subscribe, Subscriber } from "./subscription"

export type Init<model, action, flags> = (
  flags: flags
) => [model, Effects<action>]

export type Update<model, action> = (
  state: model,
  action: action
) => [model, Effects<action>]

export type View<model, action> = (
  state: model,
  address: Address<action>
) => Node

export type Subscriptions<model, action> = (
  state: model
) => Subscription<action>

type Services<message> = {
  nextAddress: number,
  outbox: Address<message>,
  active: { [key: string]: Service<message, *, *, *, *> }
}

class Application<state, message> {
  constructor(
    send: Address<message>,
    model: state,
    view: Node,
    task: Task<empty, void>,
    services: Services<message>
  ) {
    this.send = send
    this.model = model
    this.view = view
    this.task = task
    this.services = services
  }

  send: Address<message>
  model: state
  view: Node
  task: Task<empty, void>
  services: Services<message>
}

export type { Application }

export type Driver<model, message> = (
  state: Application<model, message>
) => void

export type BeginnerConfiguration<model, action> = {
  model: model,
  update: (model: model, action: action) => model,
  view: View<model, action>
}

export type AdvancedConfiguration<model, action, flags> = {
  flags: flags,
  init: Init<model, action, flags>,
  update: Update<model, action>,
  view: View<model, action>,
  subscriptions?: Subscriptions<model, action>
}

const first = <a, b>(xs: [a, b]): a => xs[0]
const second = <a, b>(xs: [a, b]): b => xs[1]

export const beginner = <model, action>(
  configuration: BeginnerConfiguration<model, action>
): AdvancedConfiguration<model, action, void> => ({
  flags: void 0,
  init: _ => [configuration.model, Effects.none],
  update: (model, action) => [
    configuration.update(model, action),
    Effects.none
  ],
  view: configuration.view,
  subscriptions: unsubscribe
})

export const start = <model, message, options>(
  configuration: AdvancedConfiguration<model, message, options>,
  drive: Driver<model, message>
): Application<model, message> => {
  const { init, view, update, flags } = configuration
  const subscriptions: Subscriptions<model, message> =
    configuration.subscriptions == null
      ? unsubscribe
      : configuration.subscriptions

  const send = action => {
    const [model, fx] = update(application.model, action)
    application.model = model
    application.view = new LazyRoot(view, model, send)
    application.task = fx.execute(send)

    application.services = subscriptions(model).reduce(
      subscribe,
      application.services
    )
    exectueServices(application.services, send)
    drive(application)
  }

  const [state, fx] = init(flags)

  const application = new Application(
    send,
    state,
    new LazyRoot(view, state, send),
    fx.execute(send),
    subscriptions(state).reduce(subscribe, {
      nextAddress: 0,
      outbox: send,
      active: Object.create(null)
    })
  )

  exectueServices(application.services, send)
  drive(application)
  return application
}

const subscribe = <message, out, inn, model, info>(
  services: Services<message>,
  subscription: Subscribe<message, out, inn, model, info>
): Services<message> => {
  const { active, outbox } = services
  const { feed, detail, tagger } = subscription
  const service = active[String(feed.address)]

  if (service == null || service.feed !== feed) {
    const address = `/${++services.nextAddress}` //`
    active[address] = spawnService(address, subscription, feed, outbox)
  } else {
    service.subscribers.push(subscription)
  }

  return services
}

const spawnService = <message, out, inn, model, info>(
  address: string,
  subscription: Subscriber<info, out, message>,
  feed: Feed<out, inn, model, info>,
  outbox: Address<message>
): Service<message, out, inn, model, info> => {
  const subscribers = [subscription]
  const state = feed.init()
  feed.address = address
  const send = (input: inn) => {
    const [state, fx] = feed.update(service.state, input, outbox)
    service.state = state
    fx.execute(send)
  }

  const service = {
    feed,
    subscribers,
    state,
    inbox: send
  }

  return service
}

const exectueServices = <a>(services: Services<a>, send: Address<a>) => {
  for (let address in services.active) {
    exectueService(services.active[address], send)
  }
}

const exectueService = <out, inn, msg, model, info>(
  service: Service<out, inn, msg, model, info>,
  outbox: Address<out>
) => {
  const { state, feed, subscribers, inbox } = service
  const [next, fx] = feed.update(state, feed.subscribe(subscribers), outbox)
  service.state = next
  fx.execute(inbox)
}
