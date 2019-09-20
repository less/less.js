/**
 * Node utilities
 */
import Node, { IProps } from './node'
import Color from './nodes/color'
import Value from './nodes/value'
import Colors from './data/colors'

/** 
 * Generalized list-merging utility, used for selectors and values
 *   e.g.
 *     .a, .b, .c {
 *        .d&.e {}
 *     }
 *   [.d, [.a, .b, .c], .e]
 */

export const mergeList = (arr: Array<any | any[]>): any[][] => {
  const result: any[][] = [arr]

  arr.forEach((item, o) => {
    if (Array.isArray(item)) {
      item.forEach((val, i) => {
        result.forEach(res => {
          if (i !== 0) {
            res = [...res]
            if (res[0].clone) {
              res.forEach((node: Node, x) => {
                res[x] = node.clone()
              })
            }
            if (val.clone) {
              val = val.clone()
            }
          }
          res[o] = val
          if (i !== 0) {
            result.push(res)
          }
        })
      })
    } else {
      result.forEach(res => {
        if (o === 0 || !item.clone) {
          res[o] = item
        } else {
          res[o] = item.clone()
        }
      })
    }
  })

  return result
}

/**
 * Math for node expressions
 */
export const add = (a: number, b: number) => a + b
export const subtract = (a: number, b: number) => a - b
export const multiply = (a: number, b: number) => a * b
export const divide = (a: number, b: number) => a / b

export const operate = (op: string, a: number, b: number) => {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return a / b
  }
}

export const fround = (value: number, precision: number = 8) => {
  // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
  return Number((value + 2e-16).toFixed(precision))
}

export const compare = (a: Node, b: Node) => {
  /* returns:
   -1: a < b
   0: a = b
   1: a > b
   and *any* other value for a != b (e.g. undefined, NaN, -2 etc.)
  */

  /** Quick string comparison */
  if (a.text && b.text && a.text === b.text) {
    return 0
  }

  let aVal = a.valueOf()
  let bVal = b.valueOf()

  if (aVal === undefined) {
    aVal = a + ''
  }
  if (bVal === undefined) {
    bVal = b + ''
  }

  if (Array.isArray(bVal) && !Array.isArray(aVal)) {
    return undefined
  }

  if (Array.isArray(aVal)) {
    const aLength = aVal.length
    let lt: number = 0
    let gt: number = 0
    let eq: number = 0

    if (!Array.isArray(bVal)) {
      return undefined
    }
    if (aVal.length !== bVal.length) {
      return undefined
    }
    aVal.forEach((val, index) => {
      if (val < bVal[index]) {
        lt++
      }
      if (val > bVal[index]) {
        gt++
      }
      if (val == bVal[index]) {
        eq++
      }
    })
    if (lt === aLength) {
      return -1
    } else if (gt === aLength) {
      return 1
    } else if (eq === aLength) {
      return 0
    } else {
      return undefined
    }
  }

  return primitiveCompare(aVal, <string | number>bVal)
}

export const primitiveCompare = (a: (number | string | boolean), b: (number | string | boolean)) => {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  /** Type coercion comparison */
  if ((a + '') === (b + '')) {
    return 0
  }
}

export const valueFromKeyword = (keyword: string): Node => {
  const key = keyword.toLowerCase()
  let c: Node
  if (Colors.hasOwnProperty(key)) {
    const int = Colors[key]
    const value = []
    int.toString(16).match(/.{2}/g).map((c: string) => {
      value.push(parseInt(c, 16))
    })
    value.push(1)

    c = new Color(<IProps>{ value, text: keyword })
  }
  else if (key === 'transparent') {
    c = new Color(<IProps>{ value: [0, 0, 0, 0], text: keyword })
  } else {
    c = new Value(keyword)
  }

  return c
}