import {main} from "reflex";
import {Model} from './types';

let { update, view } = require('./counter');
if (module.hot) {
  // Replace the pure functions on hot update
  module.hot.accept('./counter', function () {
    ({ update, view } = require('./counter'));
    application.schedule();
  });
}

let application = main(
  document.body,
  Model({value: 0}),
  // Use lambdas to proxy to newest available version
  (model, action) => update(model, action),
  (model, address) => view(model, address)
);

