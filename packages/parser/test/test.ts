import * as glob from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import { expect } from 'chai'
import 'mocha'
import { Parser } from '../src'

const testData = path.dirname(require.resolve('@less/test-data'))

const lessParser = new Parser()

describe('can parse all Less stylesheets', () => {
  const files = glob.sync(path.join(testData, 'less/**/*.less'))
  files.sort()
  files.forEach(file => {
    if (file.indexOf('static-urls') > -1) {
      it(`${file}`, () => {
        const result = fs.readFileSync(file)
        const { cst, lexerResult, parser } = lessParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.equal(0)
      });
    }
  });
});