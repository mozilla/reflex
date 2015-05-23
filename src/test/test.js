import * as tape from "tape"

export default (description, unit) => tape.test(description, test => {
  const result = unit(test)
  if (result && result.then) {
    result.then(_ => test.end(), error => test.end(error || true))
  } else {
    test.end()
  }
})
