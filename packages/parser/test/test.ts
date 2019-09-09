import * as glob from 'glob'
import * as fs from 'fs'
import { expect } from 'chai'
import 'mocha'
import { Parser } from '../src'

const lessParser = new Parser()

describe('can parse all Less stylesheets', () => {
  const files = glob.sync('../test-data/less/**/*.less')
  files.sort()
  files.forEach(file => {
    if (file.indexOf('errors') === -1) {
      it(`${file}`, () => {
        const result = fs.readFileSync(file)
        const { cst, lexerResult, parser } = lessParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.equal(0)
      });
    }
  });
});