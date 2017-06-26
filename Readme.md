# reflex [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Gitter][gitter-image]][gitter-url] [![styled with prettier][prettier.icon]][prettier]


Reflex is a functional reactive UI library that is heavily inspired by (pretty much is a port of) [elm][] and it's amazingly simple yet powerful [architecture][elm architecture] where "[flux][]" in [react][] terms is simply a byproduct of a pattern. In order to keep a major attraction of [elm][] &mdash; [algebraic data types][] & type safety &mdash; the library uses [flow][], a static type checker for JS. All types are separated from implementation though, so it's your call if you want to take take advantage of it or just ignore it.

The library is designed such that view drivers ([react][react-driver], [virtual-dom][virtual-dom-driver] & possibly more in the future) can be swapped without any changes to the application code base. In fact there is not a built-in view driver, so it's up to the user to choose one. In fact it's pretty easy to write a driver that would directly manipulate DOM.

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
[virtual-dom-driver]:https://github.com/mozilla/reflex-virtual-dom-driver
[react-driver]:https://github.com/mozilla/reflex-react-driver

[npm-url]: https://npmjs.org/package/reflex
[npm-image]: https://img.shields.io/npm/v/reflex.svg?style=flat

[travis-url]: https://travis-ci.org/mozilla/reflex
[travis-image]: https://img.shields.io/travis/mozilla/reflex.svg?style=flat

[gitter-url]: https://gitter.im/mozilla/reflex?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[gitter-image]: https://badges.gitter.im/Join%20Chat.svg
[prettier.icon]:https://img.shields.io/badge/styled_with-prettier-ff69b4.svg
[prettier]:https://github.com/prettier/prettier