var writer = require("reflex/writer")
    , dotty = require("dotty")
    , remove = require("insert/remove")
    , html = require("unpack-html")

module.exports = render

function render(source, mapping) {
    return writer(
        function swap(elements, data) {
            console.log("data", data)
            Object.keys(mapping).forEach(function (name) {
                var elem = elements[name]
                    , props = mapping[name]

                Object.keys(props).forEach(function (key) {
                    var property = props[key]

                    elem[key] = dotty.get(data, property)
                })
            })
        }
        , function open(parent) {
            var elements = html(source)

            parent(elements.root)

            return elements
        }
        , function close(elements) {
            remove(elements.root)
        }
    )
}
