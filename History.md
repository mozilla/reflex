# Changes

## 0.0.3 / 2012-12-02

  - Implement [model](./model) abstraction that can be used to map data to
    a reactors that handle IO for the specific components in the application.
  - Implement [collection](./collection) abstraction that is similar to model
    but handles collections of things.
  - Added some examples.
  - Tests.

## 0.0.2 / 2012-10-23

  - Implement notion of [state](./state.js) that can be `diff`-ed & `patch`-ed.
  - Implement [writer](./writer.js) high order function for making `write`-ers
    that can reflect state changes on the output.

## 0.0.1 / 2012-10-20

  - Initial draft
