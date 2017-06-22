/* @flow */

import { Task } from "./task"
import { Effects } from "./effects"
import { root } from "./dom"
import type { DOM } from "./dom"

import type { VirtualRoot, Address } from "./driver"
import { Subscription, Feed } from "./subscription"

import { none } from "./subscription"
import type { Never } from "./Effects"
import type { Service } from "./subscription"

export type Init<model, action, flags> = (
  flags: flags
) => [model, Effects<action>]

export type Update<model, action> = (
  model: model,
  action: action
) => [model, Effects<action>]

export type View<model, action> = (
  model: model,
  address: Address<action>
) => DOM

export type Subscriptions<model, action> = (
  state: model
) => Subscription<action>

type Services<message> = {
  nextAddress: number,
  active: { [key: string]: Service<*, *, message> }
}

class Application<model, message> {
  constructor(
    send: Address<message>,
    model: model,
    view: VirtualRoot,
    task: Task<Never, void>,
    services: Services<message>
  ) {
    this.send = send
    this.model = model
    this.view = view
    this.task = task
    this.services = services
  }

  send: Address<message>
  model: model
  view: VirtualRoot
  task: Task<Never, void>
  services: Services<message>
}

export type { Application }

export type Writer<model, action, out> = (
  application: Application<model, action>
) => out

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
  subscriptions: Subscriptions<model, action>
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
  subscriptions: model => none
})

export const start = <model, message, flags>(
  configuration: AdvancedConfiguration<model, message, flags>
) => <out>(write: Writer<model, message, out>): out => {
  const { init, view, update, subscriptions, flags } = configuration

  const send = (action: message) => {
    const [model, fx] = update(application.model, action)
    application.model = model
    application.view = root(view, model, send)
    application.task = fx.execute(send)

    application.services = subscriptions(model).reduce(
      subscribe,
      application.services
    )
    exectueServices(application.services, send)
    write(application)
  }

  const [model, fx] = init(flags)

  const application = new Application(
    send,
    model,
    root(view, model, send),
    fx.execute(send),
    subscriptions(model).reduce(subscribe, {
      nextAddress: 0,
      active: Object.create(null)
    })
  )

  exectueServices(application.services, send)
  return write(application)
}

const subscribe = <a>(services: Services<a>, subscription): Services<a> => {
  const { active } = services
  const { feed, detail } = subscription
  const service = active[`${feed.address}`]

  if (service == null || service.feed !== feed) {
    const address = `/${++services.nextAddress}`
    const subscriptions = [subscription]
    const state = feed.init()
    feed.address = address

    active[address] = { feed, subscriptions, state }
  } else {
    service.subscriptions.push(subscription)
  }

  return services
}

const exectueServices = <a>(services: Services<a>, send: Address<a>) => {
  for (let address in services.active) {
    exectueService(services.active[address], send)
  }
}

const exectueService = <a>(service: Service<a, *, *>, send: Address<a>) => {
  const { state, feed, subscriptions } = service
  const [model, fx] = feed.update(state, feed.subscribe(subscriptions))
  service.state = model
  fx.execute(send)
}
