import { parse } from '../../lib/less/parser'
import * as glob from 'glob';
import * as fs from 'fs';

import { Tokens, Fragments } from '../../lib/less/parser/cssTokens'
import { CSSParser } from '../../lib/less/parser/cssParser'
import { createParser } from '../../lib/less/parser/util'

const cssParser = createParser(CSSParser, Fragments, Tokens);

describe('Less parsing', () => {

  // xit(`single file test util`, () => {
  //     const result = fs.readFileSync('test/less/calc.less');
  //     const parsed = parse(result.toString());
  //     expect(parsed.lexErrors.length).toBe(0);
  //     expect(parsed.parseErrors.length).toBe(0);
  // });

  // describe('can parse all Less stylesheets', () => {
  //   const files = glob.sync('test/less/**/*.less');
  //   files.sort();
  //   files.forEach(file => {
  //     if (file.indexOf('errors') === -1) {
  //       it(`${file}`, () => {
  //         const result = fs.readFileSync(file);
  //         const parsed = parse(result.toString());
  //         expect(parsed.lexErrors.length).toBe(0);
  //         expect(parsed.parseErrors.length).toBe(0);
  //       });
  //     }
  //   });
  // });

  describe('can parse all Less stylesheets', () => {
    const files = glob.sync('test/less/**/*.less');
    files.sort();
    files.forEach(file => {
      if (file.indexOf('errors') === -1) {
        it(`${file}`, () => {
          const result = fs.readFileSync(file);
          const parsed = cssParser.parse(result.toString());
          expect(parsed.lexErrors.length).toBe(0);
          expect(parsed.parseErrors.length).toBe(0);
        });
      }
    });
  });
});

// const result = parse(`
// @import 'foo';

// @bird: 1px 2px 3px;

// .foo #oops {
//   &:extend(.b all);
//   foo: bar;
//   prop2: blah;

//   .testing:extend(.blah) { 
//     foo: bar;
//   }
// }
// `);

// console.log(result);