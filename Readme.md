# reflex

[![Build Status](https://secure.travis-ci.org/Gozala/reflex.png)](http://travis-ci.org/Gozala/reflex)

Reflex is a functional reactive UI library that is heavily inspired by (pretty much is a port of) [elm][] and it's amazingly simple yet powerful [architecture][elm architecture] where "[flux][]" in [react][] terms is simply a by product of a pattern. In order to keep a major attractions of [elm][] -[algebraic data types][] & type safety, library uses [flow][] a static type checker for JS to achieve somewhat the same, although all types are separated from implementation so it's your call if you want to take take advantage of it or just ignore it.

Library is designed such that view drivers ([react][react-driver], [virtual-dom][virtual-dom-driver] & possibly more in the future) could be swapped without any changes to the application code base. In fact there is not built-in view driver so it's up to user to choose one in fact it's pretty easy to write a driver that would directly manipulate DOM.

## Install

    npm install reflex

## Examples

For examples check out examples directory of either [virtual-dom][virtual-dom-driver] or [react][react-driver] drivers, in fact examples are identical only diff is one line which is path of imported driver.

[elm]:http://elm-lang.org
[elm architecture]:http://elm-lang.org/guide/architecture
[react]:http://facebook.github.io/react/
[immutable.js]:https://facebook.github.io/immutable-js/
[flux]:https://facebook.github.io/flux/
[algebraic data types]:https://en.wikipedia.org/wiki/Algebraic_data_type
[flow]:http://flowtype.org
[virtual-dom-driver]:https://github.com/Gozala/reflex-virtual-dom-driver
[react-driver]:https://github.com/Gozala/reflex-react-driver
