var widget = require("./widget")

var chart = widget(function open(data) {  
  var sheet = document.createElement('style')
  sheet.innerHTML = ".bar { -webkit-transition: width ease-in 1s;" +
                            "transition: width ease-in 1s; }"
  document.body.appendChild(sheet);

  var view = document.createElement("div")
  Object.keys(data).forEach(function(id) {
    var item = document.createElement("div")
    item.id = id
    item.className = "bar"
    item.style.height = "5px"
    item.style.margin = "2px"
    item.style.background = "orange"
    item.style.width = data[id] + "%"
    view.appendChild(item)
  })
  return view
}, function swap(state, view) {
  Object.keys(state).forEach(function(id) {
    var item = view.querySelector("#" + id)
    item.style.width = state[id] + "%"
  })
})

c1 = chart({ apples: 30, oranges: 36, grapes: 45 })

// =>



var event = require("event")
var send = require("event/send")

var input = event()

c2 = chart({ apples: 30, oranges: 36, grapes: 40 }, input)


// =>




send(input, { apples: 30, grapes: 40 })


// =>


