import test from "blue-tape"
import * as Reflex from "../"

test("test exported api", async assert => {
  assert.ok(typeof Reflex.node, "function")

  assert.ok(typeof Reflex.html, "object")
  assert.ok(typeof Reflex.html.div, "function")

  assert.ok(typeof Reflex.thunk, "function")
  assert.ok(typeof Reflex.send, "function")
  assert.ok(typeof Reflex.forward, "function")

  assert.ok(typeof Reflex.Application, "function")

  assert.ok(typeof Reflex.Task.succeed, "function")
  assert.ok(typeof Reflex.Task.fail, "function")
  assert.ok(typeof Reflex.Task.io, "function")
  assert.ok(typeof Reflex.Task.onSuccess, "function")
  assert.ok(typeof Reflex.Task.onFailure, "function")
  assert.ok(typeof Reflex.Task.perform, "function")
  assert.ok(typeof Reflex.Task.run, "function")
})
