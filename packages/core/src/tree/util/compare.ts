import { Node } from '../nodes'

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