# Changes

## 0.0.3 / ???

  - Implement notion of [component][./component] that is responsible for
    writing state changes into enclosed entities and reading changes caused
    by interactions to those entities.

## 0.0.2 / 2012-10-23

  - Implement notion of [state][./state.js] that can be `diff`-ed & `patch`-ed.
  - Implement [writer][./writer.js] high order function for making `write`-ers
    that can reflect state changes on the output.

## 0.0.1 / 2012-10-20

  - Initial draft
