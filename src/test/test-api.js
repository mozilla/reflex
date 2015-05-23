import test from "./test"
import * as Reflex from "../"

test("test exported api", assert => {
  assert.ok(typeof(Reflex.node), "function")
  assert.ok(typeof(Reflex.html), "object")
  assert.ok(typeof(Reflex.dispatch), "function")
  assert.ok(typeof(Reflex.fragment), "function")
  assert.ok(typeof(Reflex.reframe), "function")
  assert.ok(typeof(Reflex.render), "function")
  assert.ok(typeof(Reflex.main), "function")
})
