import { expect } from 'chai'
import 'mocha'

import { mergeList } from '../math'

describe('listMerge()', () => {
  it('should return the same list', () => {
    const list = ['.a', '.b']
    const result = mergeList(list)[0]
    expect(result).to.eq(list)
    expect(JSON.stringify(result)).to.eq(JSON.stringify(list))
  })

  it('should merge to .a.b, .a.c', () => {
    const list = ['.a', ['.b', '.c']]
    const result = mergeList(list)
    expect(JSON.stringify(result)).to.eq('[[".a",".b"],[".a",".c"]]')
  })

  it('should merge to .a.c, .b.c', () => {
    const list = [['.a', '.b'], '.c']
    const result = mergeList(list)
    expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"]]')
  })

  it('should merge to .a.c, .b.c', () => {
    const list = [['.a', '.b'], ['.c']]
    const result = mergeList(list)
    expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"]]')
  })

  it('should merge to .a.c, .a.d, .b.c, .b.d', () => {
    const list = [['.a', '.b'], ['.c', '.d']]
    const result = mergeList(list)
    expect(JSON.stringify(result)).to.eq('[[".a",".c"],[".b",".c"],[".a",".d"],[".b",".d"]]')
  })

  it('should merge to .a.b.d, .a.c.d', () => {
    const list = ['.a', ['.b', '.c'], '.d']
    const result = mergeList(list)
    expect(JSON.stringify(result)).to.eq('[[".a",".b",".d"],[".a",".c",".d"]]')
  })
})