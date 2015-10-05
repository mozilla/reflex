/* @flow */

// Port of http://package.elm-lang.org/packages/Dandandan/Easing/2.0.0

import {toRGB, rgba} from "./color";

/*::
import type {Color} from "./color";

export type Time = number
export type Float = number

// Type alias for Easing functions.
export type Easing = (x:Float) => Float

// An interpolation of two values using a Float value.
export type Interpolation <a> = (from:a, to:a, value:Float) => a

// An `Animation` is a function that returns a value given a duration and the current time.
export type Animation <a> = (duration:Time, time:Time) => a

// Compute an animation using the parameters.
//       Parameters are: an `Easing` function, an `Interpolation` function, a `from` value, a `to` value, the duration of the transition and the elapsed time.
//       ease(linear, float, 0, 20, second, 0) // => 0
//       ease(linear, float, 0, 20, second, second) // => 20
//       ease(linear, color, blue, red, second, second) // => red
*/

export const ease = /*::<a>*/(easing/*:Easing*/, interpolation/*:Interpolation<a>*/, from/*:a*/, to/*:a*/, duration/*:Time*/, time/*:Time*/)/*:a*/ =>
  interpolation(from, to, easing(Math.min(time / duration, 1)))

// Interpolation of two Floats
export const float = (from/*:Float*/, to/*:Float*/, progress/*:Float*/)/*:Float*/ =>
  from + (to - from) * progress

// Interpolation of two points in 2D

/*::
export type Point2D = {x: Float, y:Float}
*/
export const point2D = (from/*:Point2D*/, to/*:Point2D*/, progress/*:Float*/)/*:Point2D*/ =>
  ({
    x: float(from.x, to.x, progress),
    y: float(from.y, to.y, progress)
  })

/*::
export type Point3D = {x: Float, y:Float, z:Float}
*/
export const point3D = (from/*:Point3D*/, to/*:Point3D*/, progress/*:Float*/)/*:Point3D*/ =>
  ({
    x: float(from.x, to.x, progress),
    y: float(from.y, to.y, progress),
    z: float(from.z, to.z, progress)
  })

export const color = (from/*:Color*/, to/*:Color*/, progress/*:Float*/)/*Color*/ => {
  const [begin, end] = [toRGB(from), toRGB(to)]
  return rgba(Math.round(float(begin.red, end.red, progress)),
              Math.round(float(begin.green, end.green, progress)),
              Math.round(float(begin.blue, end.blue, progress)),
              float(begin.alpha, end.alpha, progress))
}

export const pair = /*::<a>*/(interpolate/*:Interpolation<a>*/)/*:Interpolation<[a,a]>*/ =>
  ([a0, b0]/*:[a,a]*/, [a1, b1]/*:[a,a]*/, progress/*:Float*/)/*:[a,a]*/ =>
    [interpolate(a0, a1, progress), interpolate(b0, b1, progress)]

// Inverts an `Easing` function. A transition that starts fast and continues
// slow now starts slow and continues fast.
export const invert = (easing/*:Easing*/)/*:Easing*/=>
  time => 1 - easing(1 - time)

// Flips an `Easing` function. A transition that looks like `/`, now looks like
// `\`.
export const flip = (easing/*:Easing*/)/*:Easing*/=>
  time => easing(1 - time)


// Makes an Easing function using two `Easing` functions. The first half the
// first `Easing` function is used, the other half the second.
export const inOut = (begin/*:Easing*/, end/*:Easing*/)/*:Easing*/=>
  time =>
    time < 0.5 ? begin(time * 2) / 2 :
    0.5 + (end((time - 0.5) * 2) / 2)

// Makes an `Easing` function go to the end first and then back to the start.
// A transition that looks like `/` now looks like `/\`.
export const retour = (easing/*:Easing*/)/*:Easing*/=>
  time =>
    time < 0.5 ? easing(time * 2) :
    easing(1 - ((time - 0.5) * 2))

//  Repeats an `Animation` infinitely
// const rotate = cycle(ease(linear, float, 0, 360), second)
export const cycle = /*::<a>*/ (animation/*:Animation<a>*/)/*:Animation<a>*/=>
  (duration, time) =>
    animation(1, (time / duration) - Math.floor(time / duration))


export const linear/*:Easing*/ = x => x

export const easeInQuad/*:Easing*/ = time => time ^ 2
export const easeOutQuad/*:Easing*/ = invert(easeInQuad)
export const easeInOutQuad/*:Easing*/ = inOut(easeInQuad, easeOutQuad)

export const easeInCubic/*:Easing*/ = time => time ^ 3
export const easeOutCubic/*:Easing*/ = invert(easeInCubic)
export const easeInOutCubic/*:Easing*/ = inOut(easeInCubic, easeOutCubic)

export const easeInQuart/*:Easing*/ = time => time ^ 4
export const easeOutQuart/*:Easing*/ = invert(easeInQuad)
export const easeInOutQuart/*:Easing*/ = inOut(easeInQuart, easeOutQuart)

export const easeInQuint/*:Easing*/ = time => time ^ 5
export const easeOutQuint/*:Easing*/ = invert(easeInQuint)
export const easeInOutQuint/*:Easing*/ = inOut(easeInQuint, easeOutQuint)

export const easeOutSine/*:Easing*/ = time => Math.sin(time * (Math.PI / 2))
export const easeInSine/*:Easing*/ = invert(easeOutSine)
export const easeInOutSine/*:Easing*/ = inOut(easeInSine, easeOutSine)

export const easeInExpo/*:Easing*/ = time => 2 ^ (10 * (time - 1))
export const easeOutExpo/*:Easing*/ = invert(easeInExpo)
export const easeInOutExpo/*:Easing*/ = inOut(easeInExpo, easeOutExpo)

export const easeOutCirc/*:Easing*/ = time => Math.sqrt(1 - (time - 1) ^ 2)
export const easeInCirc/*:Easing*/ = invert(easeOutCirc)
export const easeInOutCirc/*:Easing*/ = inOut(easeInCirc, easeOutCirc)

export const easeInBack/*:Easing*/ = time =>
  time * time * (2.70158 * time - 1.70158)
export const easeOutBack/*:Easing*/ = invert(easeInBack)
export const easeInOutBack/*:Easing*/ = inOut(easeInBack, easeOutBack)

export const easeOutBounce/*:Easing*/ = time => {
  const a = 7.5625
  const t2 = time - (1.5 / 2.75)
  const t3 = time - (2.25 / 2.75)
  const t4 = time - (2.65 / 2.75)

  return time < 1 / 2.75 ? a * time * time :
         time < 2 / 2.75 ? a * t2 * t2 + 0.75 :
         time < 2.5 / 2.75 ? a * t3 * t3 + 0.9375 :
         a * t4 * t4 + 0.984375
}
export const easeInBounce/*:Easing*/ = invert(easeOutBounce)
export const easeInOutBounce/*:Easing*/ = inOut(easeInBounce, easeOutBounce)

export const easeInElastic/*:Easing*/ = time => {
  const s  = 0.075
  const p  = 0.3
  const t = time - 1
  return -((2 ^ (10 * t)) * Math.sin((t - s) * (2 * Math.PI) / p))
}
export const easeOutElastic/*:Easing*/ = invert(easeInElastic)
export const easeInOutElastic/*:Easing*/ = inOut(easeInElastic, easeOutElastic)


const floats = pair(float)

const zip = /*::<x,y,z>*/(f/*:(x:x,y:y)=>z*/, xs/*:Array<x>*/, ys/*:Array<y>*/)/*:Array<z>*/ => {
  const zs = []
  const count = Math.min(xs.length, ys.length)
  let index = 0
  while (index < count) {
    zs.push(f(xs[index], ys[index]))
    index = index + 1
  }
  return zs
}

// A cubic bezier function using 4 parameters: x and y position of first
// control point, and x and y position of second control point.
export const bezier = (x1/*:Float*/, y1/*:Float*/, x2/*:Float*/, y2/*:Float*/)/*:Easing*/ =>
  time => {
    const f = (xs, ys) => floats(xs, ys, time)
    const casteljau = points => {
      if (points.length === 1) {
        const [[x, y]] = points
        return y
      } else {
        return casteljau(zip(f, points, points.slice(1)))
      }
    }

    return casteljau([[0,0], [x1,y1], [x2,y2], [1,1]])
  }
