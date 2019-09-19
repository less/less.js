/**
 * Node utilities
 */
import { Node } from './node'

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

export const fround = (context, value: number) => {
  const precision = context && context.numPrecision;
  // add "epsilon" to ensure numbers like 1.000000005 (represented as 1.000000004999...) are properly rounded:
  return (precision) ? Number((value + 2e-16).toFixed(precision)) : value;
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

  const aVal = a.value
  const bVal = b.value

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

  return numericCompare(aVal, <string | number>bVal)
}

export const numericCompare = (a: (number | string), b: (number | string)) => {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  /** Type coercion comparison */
  if (a == b) {
    return 0
  }
}