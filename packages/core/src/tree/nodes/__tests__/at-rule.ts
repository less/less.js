import { expect } from 'chai'
import 'mocha'
import AtRule from '../at-rule'
import Value from '../value'
import { ILocationInfo } from '../../node'

const mockLocation: ILocationInfo = {
  startOffset: 0,
  startLine: 0
}

describe('AtRule', () => {
  it('toString() - at-rule w/o rules', () => {
    const rule = new AtRule({
      name: '@test',
      prelude: new Value(' this is a prelude'),
      post: new Value(';')
    }, {}, mockLocation)
    expect(rule + '').to.eq('@test this is a prelude;')
  })
})