import { describe, it, expect, vi } from 'vitest';
import Declaration from './declaration';
import Value from './value';
import Keyword from './keyword';
import Anonymous from './anonymous';
import * as Constants from '../constants';

describe('Declaration', () => {
    describe('constructor', () => {
        it('creates a basic declaration', () => {
            const decl = new Declaration('color', 'red');
            expect(decl.name).toBe('color');
            expect(decl.value.value[0]).toBeInstanceOf(Anonymous);
            expect(decl.value.value[0].value).toBe('red');
            expect(decl.important).toBe('');
            expect(decl.merge).toBeUndefined();
            expect(decl.inline).toBe(false);
            expect(decl.variable).toBe(false);
        });

        it('handles variable declarations', () => {
            const decl = new Declaration('@color', 'red');
            expect(decl.variable).toBe(true);
        });

        it('handles important declarations', () => {
            const decl = new Declaration('color', 'red', '!important');
            expect(decl.important).toBe(' !important');
        });

        it('handles inline declarations', () => {
            const decl = new Declaration(
                'color',
                'red',
                null,
                false,
                0,
                {},
                true
            );
            expect(decl.inline).toBe(true);
        });

        it('accepts Node instances as values', () => {
            const valueNode = new Value([new Anonymous('blue')]);
            const decl = new Declaration('color', valueNode);
            expect(decl.value).toBe(valueNode);
        });

        it('handles null/undefined values', () => {
            const decl = new Declaration('color', null);
            expect(decl.value.value[0]).toBeNull();
        });

        it('handles array names for interpolation', () => {
            const keyword1 = new Keyword('border');
            const keyword2 = new Keyword('color');
            const decl = new Declaration([keyword1, keyword2], 'red');
            expect(Array.isArray(decl.name)).toBe(true);
            expect(decl.name[0]).toBe(keyword1);
            expect(decl.name[1]).toBe(keyword2);
        });

        it('handles merge flag', () => {
            const decl = new Declaration('color', 'red', null, true);
            expect(decl.merge).toBe(true);
        });

        it('preserves index and fileInfo', () => {
            const fileInfo = { filename: 'test.less' };
            const decl = new Declaration(
                'color',
                'red',
                null,
                false,
                123,
                fileInfo
            );
            expect(decl.getIndex()).toBe(123);
            expect(decl.fileInfo()).toBe(fileInfo);
        });
    });

    describe('genCSS', () => {
        it('generates basic CSS output', () => {
            const decl = new Declaration('color', 'red', null, false, 0, {});
            const output = { add: vi.fn() };
            decl.genCSS({ compress: false }, output);

            expect(output.add.mock.calls).toEqual([
                ['color: ', {}, 0],
                ['red', undefined, undefined, undefined],
                [';', {}, 0]
            ]);
        });

        it('generates compressed CSS output', () => {
            const decl = new Declaration('color', 'red', null, false, 0, {});
            const output = { add: vi.fn() };
            decl.genCSS({ compress: true }, output);

            expect(output.add.mock.calls).toEqual([
                ['color:', {}, 0],
                ['red', undefined, undefined, undefined],
                [';', {}, 0]
            ]);
        });

        it('generates CSS with important flag', () => {
            const decl = new Declaration(
                'color',
                'red',
                '!important',
                false,
                0,
                {}
            );
            const output = { add: vi.fn() };
            decl.genCSS({ compress: false }, output);

            expect(output.add.mock.calls).toEqual([
                ['color: ', {}, 0],
                ['red', undefined, undefined, undefined],
                [' !important;', {}, 0]
            ]);
        });

        it('omits semicolon for inline declarations', () => {
            const decl = new Declaration(
                'color',
                'red',
                null,
                false,
                0,
                {},
                true
            );
            const output = { add: vi.fn() };
            decl.genCSS({ compress: false }, output);

            expect(output.add.mock.calls).toEqual([
                ['color: ', {}, 0],
                ['red', undefined, undefined, undefined],
                ['', {}, 0]
            ]);
        });

        it('handles multiple values with commas', () => {
            const value = new Value([
                new Anonymous('1px'),
                new Anonymous('solid'),
                new Anonymous('black')
            ]);
            const decl = new Declaration('border', value, null, false, 0, {});
            const output = { add: vi.fn() };
            decl.genCSS({ compress: false }, output);

            expect(output.add.mock.calls).toEqual([
                ['border: ', {}, 0],
                ['1px', undefined, undefined, undefined],
                [', '],
                ['solid', undefined, undefined, undefined],
                [', '],
                ['black', undefined, undefined, undefined],
                [';', {}, 0]
            ]);
        });

        it('handles compressed output with multiple values', () => {
            const value = new Value([
                new Anonymous('1px'),
                new Anonymous('solid'),
                new Anonymous('black')
            ]);
            const decl = new Declaration('border', value, null, false, 0, {});
            const output = { add: vi.fn() };
            decl.genCSS({ compress: true }, output);

            expect(output.add.mock.calls).toEqual([
                ['border:', {}, 0],
                ['1px', undefined, undefined, undefined],
                [','],
                ['solid', undefined, undefined, undefined],
                [','],
                ['black', undefined, undefined, undefined],
                [';', {}, 0]
            ]);
        });

        it('handles last rule in compressed mode', () => {
            const decl = new Declaration('color', 'red', null, false, 0, {});
            const output = { add: vi.fn() };
            decl.genCSS({ compress: true, lastRule: true }, output);

            expect(output.add.mock.calls[2][0]).toBe(''); // No semicolon for last rule
        });

        it('handles errors in value generation', () => {
            const badValue = new Value([
                {
                    genCSS: () => {
                        throw new Error('Test error');
                    },
                    value: 'bad'
                }
            ]);
            const decl = new Declaration('color', badValue, null, false, 0, {
                filename: 'test.less'
            });
            const output = { add: vi.fn() };

            expect(() => decl.genCSS({ compress: false }, output)).toThrow(
                'Test error'
            );
        });
    });

    describe('eval', () => {
        const createContext = () => ({
            importantScope: [],
            math: Constants.Math.PARENS_DIVISION
        });

        it('evaluates simple declarations', () => {
            const anonymous = new Anonymous('red', 0, {
                filename: 'test.less'
            });
            expect(anonymous.value).toBe('red');

            const value = new Value([anonymous]);
            const decl = new Declaration('color', value, null, false, 0, {
                filename: 'test.less'
            });
            const context = createContext();
            const evaluated = decl.eval(context);

            expect(evaluated).toBeInstanceOf(Declaration);
            expect(evaluated.name).toBe('color');
            expect(evaluated.value).toBeInstanceOf(Anonymous);
            expect(evaluated.value.value).toBe('red');
        });

        it('evaluates interpolated names', () => {
            const keyword1 = new Keyword('border');
            const anonymous = new Anonymous('-');
            const keyword2 = new Keyword('color');
            const decl = new Declaration(
                [keyword1, anonymous, keyword2],
                'red'
            );
            const context = createContext();
            const evaluated = decl.eval(context);

            expect(evaluated.name).toBe('border-color');
        });

        it('handles detached ruleset errors', () => {
            const detachedValue = {
                type: 'DetachedRuleset',
                eval: () => ({ type: 'DetachedRuleset' })
            };
            const value = new Value([detachedValue]);
            const decl = new Declaration('prop', value, null, false, 0, {
                filename: 'test.less'
            });

            expect(() => decl.eval(createContext())).toThrow(
                'Rulesets cannot be evaluated on a property'
            );
        });

        it('handles font declarations with math context', () => {
            const decl = new Declaration('font', 'bold');
            const context = {
                ...createContext(),
                math: Constants.Math.ALWAYS
            };
            const evaluated = decl.eval(context);

            expect(evaluated.name).toBe('font');
            expect(context.math).toBe(Constants.Math.ALWAYS);
        });

        it('restores math context after font evaluation', () => {
            const decl = new Declaration('font', 'bold');
            const context = {
                ...createContext(),
                math: Constants.Math.ALWAYS
            };
            decl.eval(context);

            expect(context.math).toBe(Constants.Math.ALWAYS);
        });

        it('evaluates declarations with keyword names', () => {
            const keyword = new Keyword('width');
            const decl = new Declaration([keyword], 'auto');
            const context = createContext();
            const evaluated = decl.eval(context);

            expect(evaluated.name).toBe('width');
        });

        it('preserves important flags during evaluation', () => {
            const decl = new Declaration('color', 'red', '!important');
            const context = createContext();
            const evaluated = decl.eval(context);

            expect(evaluated.important).toBe(' !important');
        });

        it('handles errors during evaluation', () => {
            const badValue = new Value([
                {
                    eval: () => {
                        throw new Error('Eval error');
                    }
                }
            ]);
            const decl = new Declaration('color', badValue, null, false, 0, {
                filename: 'test.less'
            });
            const context = createContext();

            expect(() => decl.eval(context)).toThrow('Eval error');
        });
    });

    describe('makeImportant', () => {
        it('creates a new declaration with important flag', () => {
            const decl = new Declaration('color', 'red');
            const important = decl.makeImportant();

            expect(important).toBeInstanceOf(Declaration);
            expect(important.name).toBe('color');
            expect(important.value).toBe(decl.value);
            expect(important.important).toBe(' !important');
        });

        it('preserves other properties when making important', () => {
            const decl = new Declaration(
                'color',
                'red',
                null,
                true,
                1,
                { filename: 'test.less' },
                true
            );
            const important = decl.makeImportant();

            expect(important.merge).toBe(true);
            expect(important.getIndex()).toBe(1);
            expect(important.fileInfo()).toEqual({ filename: 'test.less' });
            expect(important.inline).toBe(true);
        });
    });
});
