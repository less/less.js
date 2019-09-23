/**
 * Math utilities
 */
import { Node } from '../nodes'

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
