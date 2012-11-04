var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return window.setImmediate;\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/node_modules/reflex/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"./index.js\"}\n//@ sourceURL=/node_modules/reflex/package.json"
));

require.define("/node_modules/reflex/writer.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar accumulate = require(\"reducers/accumulate\")\nvar end = require(\"reducers/end\")\n\nfunction writer(swap, close, open) {\n  /**\n  Writer allows you to create write functions that can be passed an `input`\n  which it will write. It composes three operations `open` that is supposed\n  to open write target and return it back. `swap` that will be invoked every\n  time there a new `input` and supposed to apply them to write target and\n  `close` invoked once `input` is ended it can be used free / cleanup opened\n  target.\n\n  ## Example\n\n      function html(tagName) {\n        return writer(function swap(element, state) {\n          element.textContent = state\n        }, function close(element) {\n          if (element.parentElement)\n          element.parentElement.removeChild(element)\n        }, function open(state) {\n          return document.createElement(tagName)\n        })\n      }\n      var h1 = html(\"h1\")\n      var input = signal()\n\n      var element = h1(input)\n      element.outerHTML // => <h1></h1>\n\n      send(input, \"hello\")\n      element.outerHTML // => <h1>hello</h1>\n  **/\n\n  return function write(input, options) {\n    /**\n    Function takes reducible `input` and writes it until `end` is reached.\n    Optional `options` could be provided to hint how write target should\n    be open / closed. Note it is **important** to pass an error free input\n    as writer has no way of handling errors there for it's recommended to\n    wrap input in a `capture` function provided by reducers to define error\n    recovery strategy. If error still slip through they will propagate to\n    a `swap` which may be a desired place to react on in some cases.\n    **/\n    // Open `output` by calling `open` with provided options.\n    var output = open(options)\n    // Accumulate input and delegate to `swap` every time there\n    // is new `data`. If `data` is `end` then just close an output.\n    // TODO: Consider throwing / logging errors instead.\n    accumulate(input, function accumulateInput(data) {\n      return data === end ? close(output, options) :\n             swap(output, data)\n    })\n\n    return output\n  }\n}\n\nmodule.exports = writer\n\n//@ sourceURL=/node_modules/reflex/writer.js"
));

require.define("/node_modules/reducers/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/reducers/package.json"
));

require.define("/node_modules/reducers/accumulate.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar Method = require(\"method\")\n\nvar isReduced = require(\"./is-reduced\")\nvar isError = require(\"./is-error\")\nvar end = require(\"./end\")\n\nvar Eventual = require(\"eventual/type\")\nvar when = require(\"eventual/when\")\n\nvar accumulate = Method()\n\n// Implementation of accumulate for the empty sequences, that immediately\n// signals end of sequence.\naccumulate.empty = function accumulateEmpty(empty, next, initial) {\n  next(end, initial)\n}\n// Implementation of accumulate for the singular values which are treated\n// as sequences with single element. Yields the given value and signals\n// the end of sequence.\naccumulate.singular = function accumulateSingular(value, next, initial) {\n  next(end, next(value, initial))\n}\n\n// Implementation accumulate for the array (and alike) values, such that it\n// will call accumulator function `next` each time with next item and\n// accumulated state until it's exhausted or `next` returns marked value\n// indicating that it's done accumulating. Either way signals end to\n// an accumulator.\naccumulate.indexed = function accumulateIndexed(indexed, next, initial) {\n  var state = initial\n  var index = 0\n  var count = indexed.length\n  while (index < count) {\n    var value = indexed[index]\n    state = next(value, state)\n    index = index + 1\n    if (value === end) return end\n    if (isError(value)) return state\n    if (isReduced(state)) return state.value\n  }\n  next(end, state)\n}\n\n// Both `undefined` and `null` implement accumulate for empty sequences.\naccumulate.define(void(0), accumulate.empty)\naccumulate.define(null, accumulate.empty)\n\n// Array and arguments implement accumulate for indexed sequences.\naccumulate.define(Array, accumulate.indexed)\naccumulate.define((function() { return arguments })(), accumulate.indexed)\n\n// All other built-in data structures are treated as single value sequences\n// by default. Of course individual types may choose to override that.\naccumulate.define(accumulate.singular)\n\n// All eventual values are treated as a single value of sequences, of\n// the value they realize to.\naccumulate.define(Eventual, function(eventual, next, initial) {\n  return when(eventual, function delivered(value) {\n    return accumulate(value, next, initial)\n  }, function failed(error) {\n    next(error, initial)\n    return error\n  })\n})\n\nmodule.exports = accumulate\n\n//@ sourceURL=/node_modules/reducers/accumulate.js"
));

require.define("/node_modules/method/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"./core.js\"}\n//@ sourceURL=/node_modules/method/package.json"
));

require.define("/node_modules/method/core.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/* vim:set ts=2 sw=2 sts=2 expandtab */\n/*jshint asi: true undef: true es5: true node: true browser: true devel: true\n         forin: true latedef: false globalstrict: true */\n'use strict';\n\n// Shortcuts for ES5 reflection functions.\nvar make = Object.create || (function() {\n  var Type = function Type() {}\n  return function make(prototype) {\n    Type.prototype = prototype\n    return new Type()\n  }\n})\nvar defineProperty = Object.defineProperty || function(object, name, property) {\n  object[name] = property.value\n  return object\n}\nvar typefy = Object.prototype.toString\n\nfunction Method(base) {\n  /**\n  Private Method is a callable private name that dispatches on the first\n  arguments same named Method: Method(...rest) => rest[0][Method](...rest)\n  Default implementation may be passed in as an argument.\n  **/\n\n  // Create an internal unique name if default implementation is passed,\n  // use it's name as a name hint.\n  var name = (base && base.name || \"\") + Math.random().toString(32).substr(2)\n\n  function dispatch() {\n    // Method dispatches on type of the first argument.\n    var target = arguments[0]\n    var builtin = null\n    // If first argument is `null` or `undefined` use associated property\n    // maps for implementation lookups, otherwise attempt to use implementation\n    // for built-in falling back for implementation on the first argument.\n    // Finally use default implementation if no other one is found.\n    var method = target === null ? Null[name] :\n                 target === undefined ? Undefined[name] :\n                 target[name] ||\n                 ((builtin = Builtins[typefy.call(target)]) && builtin[name]) ||\n                 Builtins.Object[name] ||\n                 Default[name]\n\n    // If implementation not found there's not much we can do about it,\n    // throw error with a descriptive message.\n    if (!method) throw Error('Type does not implements method')\n\n    // If implementation is found delegate to it.\n    return method.apply(method, arguments)\n  }\n\n  // Define default implementation.\n  Default[name] = base\n\n  // Define `Method.toString` returning private name, this hack will enable\n  // Method definition like follows:\n  // var foo = Method()\n  // object[foo] = function() { /***/ }\n  dispatch.toString = function toString() { return name }\n\n  // Copy utility Methods for convenient API.\n  dispatch.implement = implementMethod\n  dispatch.define = defineMethod\n\n  return dispatch\n}\n\n// Define objects where Methods implementations for `null`, `undefined` and\n// defaults will be stored.\nvar Default = {}\nvar Null = make(Default)\nvar Undefined = make(Default)\n// Implementation for built-in types are stored in the hash, this avoids\n// mutations on built-ins and allows cross frame extensions. Primitive types\n// are predefined so that `Object` extensions won't be inherited.\nvar Builtins = {\n  Object: make(Default),\n  Number: make(Default),\n  String: make(Default),\n  Boolean: make(Default)\n}\n// Define aliases for predefined built-in maps to a forms that values will\n// be serialized on dispatch.\nBuiltins[typefy.call(Object.prototype)] = Builtins.Object\nBuiltins[typefy.call(Number.prototype)] = Builtins.Number\nBuiltins[typefy.call(String.prototype)] = Builtins.String\n\n\n\nvar implement = Method(\nfunction implement(method, object, lambda) {\n  /**\n  Implements `Method` for the given `object` with a provided `implementation`.\n  Calling `Method` with `object` as a first argument will dispatch on provided\n  implementation.\n  **/\n  var target = object === null ? Null :\n               object === undefined ? Undefined :\n               object\n\n  return defineProperty(target, method.toString(), {\n    enumerable: false,\n    configurable: false,\n    writable: false,\n    value: lambda\n  })\n})\n\nvar define = Method(function define(method, Type, lambda) {\n  /**\n  Defines `Method` for the given `Type` with a provided `implementation`.\n  Calling `Method` with a first argument of this `Type` will dispatch on\n  provided `implementation`. If `Type` is a `Method` default implementation\n  is defined. If `Type` is a `null` or `undefined` `Method` is implemented\n  for that value type.\n  **/\n  if (!lambda) return implement(method, Default, Type)\n  if (!Type) return implement(method, Type, lambda)\n  var type = typefy.call(Type.prototype)\n  return type !== \"[object Object]\" ? implement(method,\n      Builtins[type] || (Builtins[type] = make(Builtins.Object)), lambda) :\n    // This should be `Type === Object` but since it will be `false` for\n    // `Object` from different JS context / compartment / frame we assume that\n    // if it's name is `Object` it is Object.\n    Type.name === \"Object\" ? implement(method, Builtins.Object, lambda) :\n    implement(method, Type.prototype, lambda)\n})\n\nvar defineMethod = function defineMethod(Type, lambda) {\n  return define(this, Type, lambda)\n}\nvar implementMethod = function implementMethod(object, lambda) {\n  return implement(this, object, lambda)\n}\n\n\n// Define exports on `Method` as it's only thing we export.\nMethod.implement = implement\nMethod.define = define\nMethod.Method = Method\nMethod.Null = Null\nMethod.Undefined = Undefined\nMethod.Default = Default\nMethod.Builtins = Builtins\n\nmodule.exports = Method\n\n//@ sourceURL=/node_modules/method/core.js"
));

require.define("/node_modules/reducers/is-reduced.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar reduced = require(\"./reduced\")\n\nfunction isReduced(value) {\n  return value && value.is === reduced\n}\n\nmodule.exports = isReduced\n\n//@ sourceURL=/node_modules/reducers/is-reduced.js"
));

require.define("/node_modules/reducers/reduced.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\n\n// Exported function can be used for boxing values. This boxing indicates\n// that consumer of sequence has finished consuming it, there for new values\n// should not be no longer pushed.\nfunction reduced(value) {\n  /**\n  Boxes given value and indicates to a source that it's already reduced and\n  no new values should be supplied\n  **/\n  return { value: value, is: reduced }\n}\n\nmodule.exports = reduced\n\n//@ sourceURL=/node_modules/reducers/reduced.js"
));

require.define("/node_modules/reducers/is-error.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar stringifier = Object.prototype.toString\n\nfunction isError(value) {\n  return stringifier.call(value) === \"[object Error]\"\n}\n\nmodule.exports = isError\n\n//@ sourceURL=/node_modules/reducers/is-error.js"
));

require.define("/node_modules/reducers/end.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nmodule.exports = String(\"End of the collection\")\n\n//@ sourceURL=/node_modules/reducers/end.js"
));

require.define("/node_modules/eventual/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/eventual/package.json"
));

require.define("/node_modules/eventual/type.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar watchers = require(\"watchables/watchers\")\nvar watch = require(\"watchables/watch\")\nvar await = require(\"pending/await\")\nvar isPending = require(\"pending/is\")\nvar deliver = require(\"./deliver\")\nvar when = require(\"./when\")\n\n// Internal utility function returns true if given value is of error type,\n// otherwise returns false.\nvar isError = (function() {\n  var stringy = Object.prototype.toString\n  var error = stringy.call(Error.prototype)\n  return function isError(value) {\n    return stringy.call(value) === error\n  }\n})()\n\n// Internal utility, identity function. Returns whatever is given to it.\nfunction identity(value) { return value }\n\n// Internal utility, decorator function that wraps given function into\n// try / catch and returns thrown exception in case when exception is\n// thrown.\nfunction attempt(f) {\n  return function effort(value) {\n    try { return f(value) }\n    catch (error) { return error }\n  }\n}\n\n\n// Define property names used by an `Eventual` type. Names are prefixed via\n// `module.id` to avoid name conflicts.\nvar observers = \"observers@\" + module.id\nvar result = \"value@\" + module.id\nvar pending = \"pending@\" + module.id\n\n\nfunction Eventual() {\n  /**\n  Data type representing eventual value, that can be observed and delivered.\n  Type implements `watchable`, `pending` and `eventual` abstractions, where\n  first two are defined in an external libraries.\n  **/\n  this[observers] = []\n  this[result] = this\n  this[pending] = true\n}\n// Expose property names via type static properties so that it's easier\n// to refer to them while debugging.\nEventual.observers = observers\nEventual.result = result\nEventual.pending = pending\n\nwatchers.define(Eventual, function(value) {\n  return value[observers]\n})\n// Eventual values considered to be pending until the are deliver by calling\n// `deliver`. Internal `pending` property is used to identify weather value\n// is being watched or not.\nisPending.define(Eventual, function(value) {\n  return value[pending]\n})\n// Eventual type implements await function of pending abstraction, to enable\n// observation of value delivery.\nawait.define(Eventual, function(value, observer) {\n  if (isPending(value)) watch(value, observer)\n  else observer(value[result])\n})\n\n// Eventual implements `deliver` function of pending abstraction, to enable\n// fulfillment of eventual values. Eventual value can be delivered only once,\n// which will transition it from pending state to non-pending state. All\n// further deliveries are ignored. It's also guaranteed that all the registered\n// observers will be invoked in FIFO order.\ndeliver.define(Eventual, function(value, data) {\n  // Ignore delivery if value is no longer pending, or if it's in a process of\n  // delivery (in this case eventual[result] is set to value other than\n  // eventual itself). Also ignore if data deliver is value itself.\n  if (value !== data && isPending(value) && value[result] === value) {\n    var count = 0\n    var index = 0\n    var delivering = true\n    var observers = void(0)\n    // Set eventual value result to passed data value that also marks value\n    // as delivery in progress. This way all the `deliver` calls is side\n    // effect to this will be ignored. Note: value should still remain pending\n    // so that new observers could be registered instead of being called\n    // immediately, otherwise it breaks FIFO order.\n    value[result] = data\n    while (delivering) {\n      // If current batch of observers is exhausted, splice a new batch\n      // and continue delivery. New batch is created only if new observers\n      // are registered in side effect to this call of deliver.\n      if (index === count) {\n        observers = watchers(value).splice(0)\n        count = observers.length\n        index = 0\n        // If new observers have not being registered mark value as no longer\n        // pending and finish delivering.\n        if (count === index) {\n          value[pending] = false\n          delivering = false\n        }\n      }\n      // Register await handlers on given result, is it may be eventual /\n      // pending itself. Delivering eventual will cause delivery of the\n      // delivered eventual's delivery value, whenever that would be.\n      else {\n        await(data, observers[index])\n        index = index + 1\n      }\n    }\n  }\n})\n\n// Eventual implements `when` polymorphic function that is part of it's own\n// abstraction. It takes `value` `onFulfill` & `onError` handlers. In return\n// when returns eventual value, that is delivered return value of the handler\n// that is invoked depending on the given values delivery. If deliver value\n// is of error type error handler is invoked. If value is delivered with other\n// non-pending value that is not of error type `onFulfill` handlers is invoked\n// with it. If pending value is delivered then it's value will be delivered\n// it's result whenever that would be. This will cause both value and error\n// propagation.\nwhen.define(Eventual, function(value, onRealize, onError) {\n  // Create eventual value for a return value.\n  var delivered = false\n  var eventual = void(0)\n  var result = void(0)\n  // Wrap handlers into attempt decorator function, so that in case of\n  // exception thrown error is returned causing error propagation. If handler\n  // is missing identity function is used instead to propagate value / error.\n  var realize = onRealize ? attempt(onRealize) : identity\n  var error = onError ? attempt(onError) : identity\n  // Wait for pending value to be delivered.\n  await(value, function onDeliver(data) {\n    // Once value is delivered invoke appropriate handler, and deliver it\n    // to a resulting eventual value.\n    result = isError(data) ? error(data)\n                           : realize(data)\n\n    // If outer function is already returned and has created eventual\n    // for it's result deliver it. Otherwise (if await called observer\n    // in same synchronously) mark result delivered.\n    if (eventual) deliver(eventual, result)\n    else delivered = true\n  })\n\n  // If result is delivered already return it, otherwise create eventual\n  // value for the result and return that.\n  return delivered ? result : (eventual = new Eventual())\n})\n\nmodule.exports = Eventual\n\n//@ sourceURL=/node_modules/eventual/type.js"
));

require.define("/node_modules/eventual/node_modules/watchables/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/eventual/node_modules/watchables/package.json"
));

require.define("/node_modules/eventual/node_modules/watchables/watchers.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*jshint asi: true undef: true es5: true node: true devel: true\n         globalstrict: true forin: true latedef: false supernew: true */\n/*global define: true */\n\n\"use strict\";\n\nvar Method = require('method')\n\n// Method is supposed to return array of watchers for the given\n// value.\nmodule.exports = Method()\n\n//@ sourceURL=/node_modules/eventual/node_modules/watchables/watchers.js"
));

require.define("/node_modules/eventual/node_modules/watchables/watch.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*jshint asi: true undef: true es5: true node: true devel: true\n         globalstrict: true forin: true latedef: false supernew: true */\n/*global define: true */\n\n\"use strict\";\n\nvar Method = require('method')\nvar watchers = require('./watchers')\n\nmodule.exports = Method(function(value, watcher) {\n  // Registers a `value` `watcher`, unless it's already registered.\n  var registered = watchers(value)\n  if (registered && registered.indexOf(watcher) < 0)\n    registered.push(watcher)\n  return value\n})\n\n//@ sourceURL=/node_modules/eventual/node_modules/watchables/watch.js"
));

require.define("/node_modules/eventual/node_modules/pending/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {}\n//@ sourceURL=/node_modules/eventual/node_modules/pending/package.json"
));

require.define("/node_modules/eventual/node_modules/pending/await.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*jshint asi: true undef: true es5: true node: true devel: true\n         globalstrict: true forin: true latedef: false supernew: true */\n/*global define: true */\n\n\"use strict\";\n\nvar Method = require('method')\n\n// Set's up a callback to be called once pending\n// value is realized. All object by default are realized.\nmodule.exports = Method(function(value, callback) {\n  callback(value)\n})\n\n//@ sourceURL=/node_modules/eventual/node_modules/pending/await.js"
));

require.define("/node_modules/eventual/node_modules/pending/is.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*jshint asi: true undef: true es5: true node: true devel: true\n         globalstrict: true forin: true latedef: false supernew: true */\n/*global define: true */\n\n\"use strict\";\n\nvar Method = require('method')\n\n// Returns `true` if given `value` is pending, otherwise returns\n// `false`. All types will return false unless type specific\n// implementation is provided to do it otherwise.\nmodule.exports = Method(function() {\n  return false\n})\n\n//@ sourceURL=/node_modules/eventual/node_modules/pending/is.js"
));

require.define("/node_modules/eventual/deliver.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\n// Anyone crating an eventual will likely need to realize it, requiring\n// dependency on other package is complicated, not to mention that one\n// can easily wind up with several copies that does not necessary play\n// well with each other. Exposing this solves the issues.\nmodule.exports = require(\"pending/deliver\")\n\n//@ sourceURL=/node_modules/eventual/deliver.js"
));

require.define("/node_modules/eventual/node_modules/pending/deliver.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*jshint asi: true undef: true es5: true node: true devel: true\n         globalstrict: true forin: true latedef: false supernew: true */\n/*global define: true */\n\n\"use strict\";\n\nvar Method = require('method')\n// Method delivers pending value.\nmodule.exports = Method()\n\n//@ sourceURL=/node_modules/eventual/node_modules/pending/deliver.js"
));

require.define("/node_modules/eventual/when.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar Method = require(\"method\")\nvar when = Method(function(value, onRealize) {\n  return typeof(onRealize) === \"function\" ? onRealize(value) : value\n})\nwhen.define(Error, function(error, onRealize, onError) {\n  return typeof(onError) === \"function\" ? onError(error) : error\n})\n\nmodule.exports = when\n\n//@ sourceURL=/node_modules/eventual/when.js"
));

require.define("/node_modules/reducers/map.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar reducer = require(\"./reducer\")\n\nvar map = reducer(function map(f, next, value, result) {\n  /**\n  Returns transformed version of given `source` where each item of it\n  is mapped using `f`.\n\n  ## Example\n\n  var data = [{ name: \"foo\" }, { name: \"bar\" }]\n  var names = map(data, function(value) { return value.name })\n  print(names) // => < \"foo\" \"bar\" >\n  **/\n  next(f(value), result)\n})\n\nmodule.exports = map\n\n//@ sourceURL=/node_modules/reducers/map.js"
));

require.define("/node_modules/reducers/reducer.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar accumulate = require(\"./accumulate\")\nvar reducible = require(\"./reducible\")\nvar isError = require(\"./is-error\")\nvar end = require(\"./end\")\n\n\nfunction reducer(process) {\n  return function reducer(source, options) {\n    return reducible(function(next, initial) {\n      accumulate(source, function(value, result) {\n        return value === end ? next(value, result) :\n               isError(value) ? next(value, result) :\n               process(options, next, value, result)\n      })\n    })\n  }\n}\n\nmodule.exports = reducer\n\n//@ sourceURL=/node_modules/reducers/reducer.js"
));

require.define("/node_modules/reducers/reducible.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar accumulate = require(\"./accumulate\")\nvar when = require(\"eventual/when\")\nvar end = require(\"./end\")\nvar isError = require(\"./is-error\")\nvar isReduced = require(\"./is-reduced\")\nvar reduced = require(\"./reduced\")\n\nfunction Reducible(reduce) {\n  /**\n  Reducible is a type of the data-structure that represents something\n  that can be reduced. Most of the time it's used to represent transformation\n  over other reducible by capturing it in a lexical scope.\n\n  Reducible has an attribute `reduce` pointing to a function that does\n  reduction.\n  **/\n\n  // JS engines optimize access to properties that are set in the constructor's\n  // so we set it here.\n  this.reduce = reduce\n}\n\n// Implementation of `accumulate` for reducible, which just delegates to it's\n// `reduce` attribute.\naccumulate.define(Reducible, function accumulate(reducible, next, initial) {\n  var result\n  // State is intentionally accumulated in the outer variable, that way no\n  // matter if consumer is broken and passes in wrong accumulated state back\n  // this reducible will still behave as intended.\n  var state = initial\n  reducible.reduce(function forward(value) {\n    try {\n      // If reduce reduction has already being completed just return\n      // `result` that is last state boxed in `reduced`. That way anything\n      // trying to dispatch after it's closed or error-ed will just be handed\n      // a `reduced` `state` indicating last value and no intent of getting\n      // more values.\n      if (result) return result\n\n      // If value is an `error` (that also includes `end` of stream) we just\n      // throw and let `catch` block do the rest of the job.\n      if (value === end || isError(value)) throw value\n\n      // Otherwise new `state` is accumulated `by` forwarding a `value` to an\n      // actual `next` handler.\n      state = next(value, state)\n\n      // If new `state` is boxed in `reduced` than source should be stopped\n      // and no more values should be forwarded to a `next` handler. To do\n      // that we throw `end` and let `catch` block do the rest of the job.\n      if (isReduced(state)) throw end\n\n      // If code got that far then nothing special happened and `new` state is\n      // just returned back, to a consumer.\n      return state\n    }\n    // If `error` is thrown that may few things:\n    //\n    //  1. Last value dispatched was indicator of an error (that also includes\n    //     `end` of stream).\n    //  2. Provided `next` handler threw an exception causing stream failure.\n    //\n    // When this happens stream is either finished or error-ed, either way\n    // no new items should get through. There for last `state` is boxed with\n    // `reduced` and store as a `result` of this accumulation. Any subsequent\n    // attempts of providing values will just get it in return, hopefully\n    // causing source of value to get closed.\n    catch (error) {\n      if (isReduced(state)) {\n        result = state\n        state = result.value\n      } else {\n        result = reduced(state)\n      }\n      // Maybe we should console.error exceptions if such arise when calling\n      // `next` in the following line.\n      next(error, state)\n      return result\n    }\n  }, null)\n})\n\nfunction reducible(reduce) {\n  return new Reducible(reduce)\n}\nreducible.type = Reducible\n\nmodule.exports = reducible\n\n//@ sourceURL=/node_modules/reducers/reducible.js"
));

require.define("/node_modules/dom-reduce/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"./index.js\"}\n//@ sourceURL=/node_modules/dom-reduce/package.json"
));

require.define("/node_modules/dom-reduce/event.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/* vim:set ts=2 sw=2 sts=2 expandtab */\n/*jshint asi: true undef: true es5: true node: true browser: true devel: true\n         forin: true latedef: false globalstrict: true */\n\n\"use strict\";\n\nvar reducible = require(\"reducers/reducible\")\nvar isReduced = require(\"reducers/is-reduced\")\n\nfunction open(target, type, options) {\n  /**\n  Capture events on a DOM element, converting them to a reducible channel.\n  Returns a reducible channel.\n\n  ## Example\n\n      var allClicks = open(document.documentElement, \"click\")\n      var clicksOnMyTarget = filter(allClicks, function (click) {\n        return click.target === myTarget\n      })\n  **/\n  var capture = options && options.capture || false\n  return reducible(function(next, result) {\n    function handler(event) {\n      result = next(event, result)\n      //  When channel is marked as accumulated, remove event listener.\n      if (isReduced(result)) {\n        if (target.removeEventListener)\n          target.removeEventListener(type, handler, capture)\n        else\n          target.detachEvent(type, handler, capture)\n      }\n    }\n    if (target.addEventListener) target.addEventListener(type, handler, capture)\n    else target.attachEvent(\"on\" + type, handler)\n  })\n}\n\nmodule.exports = open\n\n//@ sourceURL=/node_modules/dom-reduce/event.js"
));

require.define("/node_modules/reducers/reduce.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar deliver = require(\"eventual/deliver\")\nvar defer = require(\"eventual/defer\")\nvar when = require(\"eventual/when\")\nvar accumulate = require(\"./accumulate\")\nvar isError = require(\"./is-error\")\nvar isReduced = require(\"./is-reduced\")\nvar end = require(\"./end\")\n\nfunction reduce(source, next, initial) {\n  var promise = defer()\n  accumulate(source, function reduce(value, state) {\n\n    if (value === end) return deliver(promise, state)\n    else if (isError(value)) return deliver(promise, value)\n\n    state = next(state, value)\n\n    if (isReduced(state)) deliver(promise, state.value)\n\n    return state\n  }, initial)\n  return when(promise, null, function(error) { return error })\n}\n\nmodule.exports = reduce\n\n//@ sourceURL=/node_modules/reducers/reduce.js"
));

require.define("/node_modules/eventual/defer.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar Eventual = require(\"./type\")\nmodule.exports = function defer() { return new Eventual() }\n\n//@ sourceURL=/node_modules/eventual/defer.js"
));

require.define("/node_modules/reducers/filter.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar reducer = require(\"./reducer\")\n\nvar filter = reducer(function filter(predicate, next, value, result) {\n  /**\n  Composes filtered version of given `source`, such that only items contained\n  will be once on which `f(item)` was `true`.\n\n  ## Example\n\n  var digits = filter([ 10, 23, 2, 7, 17 ], function(value) {\n    return value >= 0 && value <= 9\n  })\n  print(digits) // => < 2 7 >\n  **/\n  return predicate(value) ? next(value, result) :\n         result\n})\n\nmodule.exports = filter\n\n//@ sourceURL=/node_modules/reducers/filter.js"
));

require.define("/node_modules/reducers/delay.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar reducible = require(\"./reducible\")\nvar accumulate = require(\"./accumulate\")\nvar isReduced = require(\"./is-reduced\")\nvar end = require(\"./end\")\n\nfunction delay(source, ms) {\n  ms = ms || 6 // Minimum 6ms, as on less dispatch order becomes unreliable\n  return reducible(function(next, result) {\n    var timeout = 0\n    var ended = false\n    accumulate(source, function(value) {\n      setTimeout(function() {\n        if (!ended) {\n          timeout = timeout - ms\n          result = next(value, result)\n          if (isReduced(result)) {\n            ended = true\n            next(end)\n          }\n        }\n      }, timeout = timeout + ms)\n      return result\n    })\n  })\n}\n\nmodule.exports = delay\n\n//@ sourceURL=/node_modules/reducers/delay.js"
));

require.define("/html-writer.js",Function(['require','module','exports','__dirname','__filename','process','global'],"\"use strict\";\n\nvar writer = require(\"reflex/writer\")\nvar map = require(\"reducers/map\")\nvar filter = require(\"reducers/filter\")\nvar reduce = require(\"reducers/reduce\")\nvar delay = require(\"reducers/delay\")\nvar open = require(\"dom-reduce/event\")\n\nfunction html(tagName) {\n  return writer(function swap(element, state) {\n    element.textContent = state\n  }, function close(element) {\n  if (element.parentElement)\n    element.parentElement.removeChild(element)\n  }, function open(state) {\n    var element = document.createElement(tagName)\n    document.documentElement.appendChild(element)\n    return element\n  })\n}\n\n\n// Take all keyup events that propagate to the document element.\nvar keyupEvents = open(document.documentElement, \"keyup\")\n// Filter only to an events on the elements who's type is \"text\"\nvar inputChangeEvents = filter(keyupEvents, function(event) {\n  return event.target.type === \"text\"\n})\n// Map input change events to current values of the input element.\nvar inputs = map(inputChangeEvents, function(event) {\n  return event.target.value\n})\n\n// Create `h1` html writer & italic html writer.\nvar h1 = html(\"h1\")\nvar h2 = html(\"h2\")\nvar h3 = html(\"h3\")\nvar h4 = html(\"h4\")\nvar h5 = html(\"h5\")\nvar italic = html(\"i\")\n\n// And write inputs into both of them\nh1(inputs)\n\nvar offest = 35\nh2(delay(inputs, offest * 1))\nh3(delay(inputs, offest * 2))\nh4(delay(inputs, offest * 3))\nh5(delay(inputs, offest * 4))\nitalic(delay(inputs, offest * 5))\n\n//@ sourceURL=/html-writer.js"
));
require("/html-writer.js");
