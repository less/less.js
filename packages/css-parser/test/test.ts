import * as glob from 'glob'
import * as fs from 'fs'
import { expect } from 'chai'
import 'mocha'
import * as cssParser from '../src/parser'

describe('can parse all CSS stylesheets', () => {
  const files = glob.sync('test/css/**/*.css')
  files.sort()
  files.forEach(file => {
    if (file.indexOf('errors') === -1) {
      it(`${file}`, () => {
        const result = fs.readFileSync(file)
        const { cst, lexerResult, parser } = cssParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.equal(0)
      });
    }
  });
});