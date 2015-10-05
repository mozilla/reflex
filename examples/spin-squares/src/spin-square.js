/* @flow */
import {Record, Union} from "typed-immutable"
import {html, forward, Effects, Task} from "reflex"
import {ease, easeOutBounce, float} from "./easing"

/*::
import type {Float, Time} from "./easing"
import type {Address} from "reflex/src/signal"
import type {VirtualElement} from "reflex/src/core"


export type AnimationState = {
  lastTime: Time,
  elapsedTime: Time
}

export type Model = {
  angle:Float,
  animationState:?AnimationState
}
*/



export const create = ({angle, animationState}/*:Model*/)/*:Model*/=>
  ({angle, animationState})

export const initialize = ()/*:[Model, Effects<Action>]*/ =>
  [create({angle: 0, animationState:null}), Effects.none]

const rotateStep = 90
const ms = 1
const second = 1000 * ms
const duration = second

/*::
export type Spin = {$typeof: "Spin"}
export type Tick = {$typeof: "Tick", time: Time}
export type Action = Spin|Tick
*/

export const SpinAction = ()/*:Spin*/ =>
  ({$typeof: "Spin"})
export const TickAction = (time/*:Time*/)/*:Tick*/ =>
  ({$typeof: "Tick", time})

export const step = (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ => {
  if (action.$typeof === "Spin") {
    if (model.animationState == null) {
      return [model, Effects.tick(TickAction)]
    } else {
      return [model, Effects.none]
    }
  }

  if (action.$typeof === "Tick") {
    const {animationState, angle} = model
    const elapsedTime = animationState == null ? 0 :
                        animationState.elapsedTime + (action.time - animationState.lastTime)

    if (elapsedTime > duration) {
      return [
        {angle: angle + rotateStep, animationState: null},
        Effects.none
      ]
    } else {
      return [
        {angle, animationState: {elapsedTime, lastTime: action.time}},
        Effects.tick(TickAction)
      ]
    }
  }


  return [model, Effects.none]
}

// View

const toOffset = (animationState/*:AnimationState*/)/*:Float*/ =>
  animationState == null ? 0 :
  ease(easeOutBounce, float, 0, rotateStep, duration, animationState.elapsedTime)

const toAngle = ({angle, animationState}/*:model*/)/*:Float*/ =>
  angle + toOffset(animationState)

const style = {
  square: {
    width: "200px",
    height: "200px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#60B5CC",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "30px"
  },
  spin({angle, animationState}/*:model*/)/*:Object*/{
    return {
      transform: `translate(100px, 100px) rotate(${angle + toOffset(animationState)}deg)`
    }
  }
}

export const view = (model/*:Model*/, address/*:Address<Action>*/)/*:VirtualElement*/ =>
  html.figure({
    key: "spin-square",
    style: Object.assign(style.spin(model), style.square),
    onClick: forward(address, SpinAction)
  }, ["Click me!"])
