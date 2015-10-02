/* @flow */
import {Record, Union} from "typed-immutable";
import {html, forward, Effects, Task} from "reflex";

/*::
import type {Address} from "reflex/src/signal"
import type {VirtualElement} from "reflex/src/core"


export type Model = {
  topic:string,
  uri:string
}
*/



export const create = ({topic, uri}/*:Model*/)/*:Model*/=>
  ({topic, uri})

export const initialize = (topic/*:string*/)/*:[Model, Effects<Action>]*/ =>
  [create({topic, uri: "assets/waiting.gif"}), getRandomGif(topic)]


/*::
export type RequestMore = {$typeof: "RequestMore"}
export type NewGif = {$typeof: "NewGif", uri: ?string}
export type Action = RequestMore|NewGif
*/

export const RequestMoreAction = ()/*:RequestMore*/ =>
  ({$typeof: "RequestMore"})
export const NewGifAction = (uri/*:?string*/)/*:NewGif*/ =>
  ({$typeof: "NewGif", uri})

export const step = (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ =>
  action.$typeof === "RequestMore" ? [model, getRandomGif(model.topic)] :
  action.$typeof === "NewGif" ?
    [create({topic: model.topic,
             uri: action.uri != null ? action.uri : model.uri})
    ,Effects.none] :
    [model, Effects.none]

const randomURI = (topic/*:string*/)/*:string*/ =>
  `http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=${topic}`

/*::
type ResponseBody = {data: ?{image_uri: ?string}}
type Response = {json: () => Promise<ResponseBody>}
*/
const decodeResponseBody = (body/*:ResponseBody*/)/*:?string*/ =>
  (body.data && body.data.image_url) || null

const readResponseAsJSON = (response/*:Response*/) => response.json()

const fetch = global.fetch != null ? global.fetch :
              uri => new Promise((resolve, reject) => {
                const request = new XMLHttpRequest()
                request.open('GET', uri, true)
                request.onload = () => {
                  const status = request.status === 1223 ? 204 : request.status
                  if (status < 100 || status > 599) {
                    reject(Error('Network request failed'))
                  } else {
                    resolve({
                      json() {
                        return new Promise(resolve => {
                          resolve(JSON.parse(request.responseText))
                        })
                      }
                    })
                  }
                }
                request.onerror = () => {
                  reject(Error('Network request failed'))
                }
                request.send()
              })

export const getRandomGif = (topic/*:string*/)/*:Effects<Action>*/ =>
  Task.future(() => fetch(randomURI(topic))
                      .then(readResponseAsJSON)
                      .then(decodeResponseBody)
                      .then(NewGifAction))

const style = {
  viewer: {
    width: "200px"
  },
  header: {
    width: "200px",
    textAlign: "center"
  },
  image(uri) {
    return {
      display: "inline-block",
      width: "200px",
      height: "200px",
      backgroundPosition: "center center",
      backgroundSize: "cover",
      backgroundImage: `url('${uri}')`
    }
  }
}

export const view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.div({key: "gif-viewer", style: style.viewer}, [
    html.h2({key: "header", style: style.header}, [model.topic]),
    html.div({key: "image", style: style.image(model.uri)}),
    html.button({key: "button", onClick: forward(address, RequestMoreAction)}, [
      "More please!"
    ])
  ])
