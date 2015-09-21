/* @flow */

import {thunk} from "./core";
/*::
import type {VirtualElement} from "./core";
import type {Address} from "./address";
import type {Task} from "./task";
*/

var ignore = value => void(0)

class Output /*::<a>*/ {
  /*::
  value: a;
  notify: (action:a) => void;
  */
  constructor(value) {
    this.value = value
    this.notify = ignore
  }
  // TODO: Report flowtype issue as specifying argument type here seems
  // redundunt but flow check seems to fail without it.
  send(value/*:a*/) {
    this.notify(this.value = value)
  }
  subscribe(notify) {
    this.notify = notify
    this.notify(this.value)
  }
}

/*::
type Effect <a> = Task<void,a>
*/

export class Application /*::<x,a,m>*/ {
  /*::
  initialize: () => [m, Effect<a>];
  update: (model:m, action:a) => [m, Effect<a>];
  toView: (model:m, address:Address<x,a>) => VirtualElement;
  address: Address<x, a>;

  model: Output<m>;
  view: Output<VirtualElement>;
  task: Output<Effect<a>>;
  */
  constructor({initialize, update, view}) {
    this.initialize = initialize
    this.update = update
    this.toView = view
    this.address = this.send.bind(this)

    var [model, effect] = initialize()

    this.model = new Output(model)
    this.task = new Output(effect)
    this.view = new Output(thunk('application',
                                  this.toView,
                                  this.model.value,
                                  this.address))
  }
  send(action/*:a*/) {
    var [model, effect] = this.update(this.model.value, action)
    this.model.send((model/*:m*/))
    this.view.send(thunk('application',
                         this.toView,
                         this.model.value,
                         this.address))
    this.task.send(effect)
  }
}
