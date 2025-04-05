import { describe, it, expect, vi } from 'vitest';
import functionCaller from './function-caller';
import Expression from '../tree/expression';

describe('functionCaller', () => {
    const mockContext = {
        frames: [
            {
                functionRegistry: {
                    get: vi.fn()
                }
            }
        ]
    };

    const mockFileInfo = {};

    it('should create a functionCaller instance with lowercase name', () => {
        mockContext.frames[0].functionRegistry.get.mockReturnValue(() => {});
        const caller = new functionCaller(
            'TestFunction',
            mockContext,
            0,
            mockFileInfo
        );

        expect(caller.name).toBe('testfunction');
        expect(caller.index).toBe(0);
        expect(caller.context).toBe(mockContext);
        expect(caller.currentFileInfo).toBe(mockFileInfo);
    });

    it('should return true for isValid when function exists', () => {
        mockContext.frames[0].functionRegistry.get.mockReturnValue(() => {});
        const caller = new functionCaller('test', mockContext, 0, mockFileInfo);

        expect(caller.isValid()).toBe(true);
    });

    it('should return false for isValid when function does not exist', () => {
        mockContext.frames[0].functionRegistry.get.mockReturnValue(null);
        const caller = new functionCaller(
            'nonexistent',
            mockContext,
            0,
            mockFileInfo
        );

        expect(caller.isValid()).toBe(false);
    });

    it('should throw error when name is missing', () => {
        expect(() => {
            new functionCaller(undefined, mockContext, 0, mockFileInfo);
        }).toThrow();
    });

    it('should handle invalid context structure gracefully', () => {
        const invalidContext = { frames: [] };
        expect(() => {
            new functionCaller('test', invalidContext, 0, mockFileInfo);
        }).toThrow(TypeError);
    });

    it('should handle null/undefined functionRegistry gracefully', () => {
        const contextWithoutRegistry = {
            frames: [{}]
        };
        expect(() => {
            new functionCaller('test', contextWithoutRegistry, 0, mockFileInfo);
        }).toThrow(TypeError);
    });

    describe('call method', () => {
        it('should wrap single argument in array', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const arg = { eval: () => 'evaluated' };

            caller.call(arg);

            expect(mockFunc).toHaveBeenCalledWith('evaluated');
        });

        it('should handle array of arguments', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [{ eval: () => 'first' }, { eval: () => 'second' }];

            caller.call(args);

            expect(mockFunc).toHaveBeenCalledWith('first', 'second');
        });

        it('should handle empty array of arguments', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            caller.call([]);

            expect(mockFunc).toHaveBeenCalledWith();
        });

        it('should filter out Comment nodes', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [
                { eval: () => ({ type: 'Comment' }) },
                { eval: () => 'valid' }
            ];

            caller.call(args);

            expect(mockFunc).toHaveBeenCalledWith('valid');
        });

        it('should handle Expression containing only Comment nodes', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [
                {
                    type: 'Expression',
                    value: [{ type: 'Comment' }, { type: 'Comment' }],
                    eval: () => ({
                        type: 'Expression',
                        value: [{ type: 'Comment' }]
                    })
                }
            ];

            caller.call(args);

            // Expect a new Expression with empty value array
            expect(mockFunc).toHaveBeenCalledWith(
                expect.objectContaining({
                    value: [],
                    type: 'Expression'
                })
            );
        });

        it('should handle nested Expression nodes', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const nestedExpr = {
                type: 'Expression',
                value: [
                    {
                        type: 'Expression',
                        value: [{ type: 'Value', eval: () => 'nested' }],
                        eval: () => ({ type: 'Value', eval: () => 'nested' })
                    }
                ],
                eval: () => ({
                    type: 'Expression',
                    value: [{ type: 'Value', eval: () => 'nested' }]
                })
            };

            caller.call([nestedExpr]);

            expect(mockFunc).toHaveBeenCalledWith({
                type: 'Value',
                eval: expect.any(Function)
            });
        });

        it('should handle Expression nodes with single item', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [
                {
                    eval: () => ({
                        type: 'Expression',
                        value: [{ type: 'Value', eval: () => 'extracted' }]
                    })
                }
            ];

            caller.call(args);

            expect(mockFunc).toHaveBeenCalledWith({
                type: 'Value',
                eval: expect.any(Function)
            });
        });

        it('should preserve Expression with parens when op is division', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const expressionWithParens = {
                type: 'Expression',
                parens: true,
                value: [{ op: '/', eval: () => 'division' }],
                eval: () => expressionWithParens
            };

            caller.call([expressionWithParens]);

            expect(mockFunc).toHaveBeenCalledWith(expressionWithParens);
        });

        it('should handle multiple Expression nodes with different parens configurations', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [
                {
                    type: 'Expression',
                    parens: true,
                    value: [{ op: '/', eval: () => 'div1' }],
                    eval: () => ({
                        type: 'Expression',
                        parens: true,
                        value: [{ op: '/', eval: () => 'div1' }]
                    })
                },
                {
                    eval: () => ({
                        op: '+',
                        eval: () => 'add1'
                    })
                }
            ];

            caller.call(args);

            const [[firstArg, secondArg]] = mockFunc.mock.calls;

            expect(firstArg).toEqual(
                expect.objectContaining({
                    type: 'Expression',
                    parens: true,
                    value: expect.arrayContaining([
                        expect.objectContaining({ op: '/' })
                    ])
                })
            );

            expect(secondArg).toEqual(
                expect.objectContaining({
                    op: '+'
                })
            );
        });

        it('should handle functions with evalArgs: false', () => {
            const mockFunc = vi.fn();
            mockFunc.evalArgs = false;
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [{ raw: 'value' }];

            caller.call(args);

            expect(mockFunc).toHaveBeenCalledWith(mockContext, {
                raw: 'value'
            });
        });

        it('should handle functions with evalArgs explicitly set to true', () => {
            const mockFunc = vi.fn();
            mockFunc.evalArgs = true;
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [{ eval: () => 'evaluated' }];

            caller.call(args);

            expect(mockFunc).toHaveBeenCalledWith('evaluated');
        });

        it('should create new Expression for multiple filtered nodes', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const multipleNodes = {
                type: 'Expression',
                value: [
                    { type: 'Value', eval: () => 'first' },
                    { type: 'Comment' },
                    { type: 'Value', eval: () => 'second' }
                ],
                eval: () => multipleNodes
            };

            caller.call([multipleNodes]);

            expect(mockFunc).toHaveBeenCalledWith(expect.any(Expression));
        });

        it('should handle undefined/null argument', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );

            expect(() => caller.call(undefined)).toThrow(TypeError);
            expect(() => caller.call(null)).toThrow(TypeError);
        });

        it('should handle arguments without eval method when evalArgs is true', () => {
            const mockFunc = vi.fn();
            mockFunc.evalArgs = true;
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [{ value: 'no-eval' }];

            expect(() => caller.call(args)).toThrow();
        });

        it('should handle Expression with noSpacing property', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const expr = {
                type: 'Expression',
                noSpacing: true,
                value: [
                    {
                        type: 'Value',
                        eval: () => ({ type: 'Value', eval: () => 'value' })
                    }
                ],
                eval: () => ({
                    type: 'Expression',
                    noSpacing: true,
                    value: [
                        {
                            type: 'Value',
                            eval: () => ({ type: 'Value', eval: () => 'value' })
                        }
                    ]
                })
            };

            caller.call([expr]);

            expect(mockFunc).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'Value',
                    eval: expect.any(Function)
                })
            );
        });

        it('should handle Expression with mixed node types', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const mixedExpr = {
                type: 'Expression',
                value: [
                    { type: 'Value', eval: () => 'value1' },
                    { type: 'Comment' },
                    { type: 'Operation', eval: () => 'operation' },
                    { type: 'Comment' },
                    { type: 'Value', eval: () => 'value2' }
                ],
                eval: () => ({
                    type: 'Expression',
                    value: [
                        { type: 'Value', eval: () => 'value1' },
                        { type: 'Comment' },
                        { type: 'Operation', eval: () => 'operation' },
                        { type: 'Comment' },
                        { type: 'Value', eval: () => 'value2' }
                    ]
                })
            };

            caller.call([mixedExpr]);

            expect(mockFunc).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'Expression',
                    value: expect.arrayContaining([
                        expect.objectContaining({ eval: expect.any(Function) }),
                        expect.objectContaining({ eval: expect.any(Function) }),
                        expect.objectContaining({ eval: expect.any(Function) })
                    ])
                })
            );
        });

        it('should handle nested comments in expressions', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const nestedComments = {
                type: 'Expression',
                value: [
                    {
                        type: 'Expression',
                        value: [
                            { type: 'Comment' },
                            { type: 'Value', eval: () => 'nested-value' },
                            { type: 'Comment' }
                        ],
                        eval: () => ({
                            type: 'Expression',
                            value: [
                                { type: 'Comment' },
                                { type: 'Value', eval: () => 'nested-value' },
                                { type: 'Comment' }
                            ]
                        })
                    }
                ],
                eval: () => nestedComments
            };

            caller.call([nestedComments]);

            expect(mockFunc).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'Expression',
                    value: expect.arrayContaining([
                        expect.objectContaining({ eval: expect.any(Function) })
                    ])
                })
            );
        });

        it('should handle eval errors gracefully', () => {
            const mockFunc = vi.fn();
            mockContext.frames[0].functionRegistry.get.mockReturnValue(
                mockFunc
            );

            const caller = new functionCaller(
                'test',
                mockContext,
                0,
                mockFileInfo
            );
            const args = [
                {
                    eval: () => {
                        throw new Error('Eval failed');
                    }
                }
            ];

            expect(() => caller.call(args)).toThrow('Eval failed');
        });
    });
});
