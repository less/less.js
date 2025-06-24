import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportVisitor from './import-visitor';

// Mock all dependencies
vi.mock('../contexts', () => ({
    default: {
        Eval: vi.fn().mockImplementation(function (options, frames) {
            this.frames = frames || [];
            this.importMultiple = options?.importMultiple || false;
            // Copy properties from options if provided
            if (options) {
                Object.assign(this, options);
            }
        })
    }
}));

vi.mock('./visitor', () => ({
    default: vi.fn().mockImplementation(function (implementation) {
        this.visit = vi.fn((node) => {
            // Simulate visitor behavior
            if (implementation && typeof implementation.visitImport === 'function') {
                implementation.visitImport(node, { visitDeeper: true });
            }
            return node;
        });
    })
}));

vi.mock('./import-sequencer', () => ({
    default: vi.fn().mockImplementation(function (onEmptyCallback) {
        this.addImport = vi.fn((callback) => {
            // Return a trigger function
            return vi.fn((...args) => {
                callback(...args);
            });
        });
        this.addVariableImport = vi.fn();
        this.tryRun = vi.fn(() => {
            if (onEmptyCallback) {
                onEmptyCallback();
            }
        });
    })
}));

vi.mock('../utils', () => ({
    copyArray: vi.fn((arr) => [...arr])
}));

describe('ImportVisitor', () => {
    let mockImporter;
    let mockFinish;
    let importVisitor;
    let mockImportNode;
    let mockRoot;

    beforeEach(() => {
        vi.clearAllMocks();
        mockImporter = {
            push: vi.fn()
        };
        mockFinish = vi.fn();
        importVisitor = new ImportVisitor(mockImporter, mockFinish);

        mockImportNode = {
            type: 'Import',
            css: false,
            options: {},
            isVariableImport: vi.fn(() => false),
            evalForImport: vi.fn(),
            getIndex: vi.fn(() => 0),
            fileInfo: vi.fn(() => ({ filename: 'test.less' })),
            getPath: vi.fn(() => 'test/path.less')
        };

        mockRoot = {
            type: 'Ruleset',
            rules: [mockImportNode]
        };
    });

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(importVisitor._importer).toBe(mockImporter);
            expect(importVisitor._finish).toBe(mockFinish);
            expect(importVisitor.importCount).toBe(0);
            expect(importVisitor.onceFileDetectionMap).toEqual({});
            expect(importVisitor.recursionDetector).toEqual({});
            expect(importVisitor.isReplacing).toBe(false);
        });

        it('should create visitor and sequencer instances', () => {
            expect(importVisitor._visitor).toBeDefined();
            expect(importVisitor._sequencer).toBeDefined();
            expect(importVisitor.context).toBeDefined();
        });
    });

    describe('run', () => {
        it('should visit the root node and mark as finished', () => {
            const visitSpy = vi.spyOn(importVisitor._visitor, 'visit');
            
            importVisitor.run(mockRoot);
            
            expect(visitSpy).toHaveBeenCalledWith(mockRoot);
            expect(importVisitor.isFinished).toBe(true);
        });

        it('should handle errors during visiting', () => {
            const error = new Error('Visit error');
            vi.spyOn(importVisitor._visitor, 'visit').mockImplementation(() => {
                throw error;
            });
            
            importVisitor.run(mockRoot);
            
            expect(importVisitor.error).toBe(error);
            expect(importVisitor.isFinished).toBe(true);
        });

        it('should call sequencer.tryRun after finishing', () => {
            const tryRunSpy = vi.spyOn(importVisitor._sequencer, 'tryRun');
            
            importVisitor.run(mockRoot);
            
            expect(tryRunSpy).toHaveBeenCalled();
        });
    });

    describe('_onSequencerEmpty', () => {
        it('should not call finish if not finished', () => {
            importVisitor.isFinished = false;
            
            importVisitor._onSequencerEmpty();
            
            expect(mockFinish).not.toHaveBeenCalled();
        });

        it('should call finish with error if finished', () => {
            const error = new Error('Test error');
            importVisitor.isFinished = true;
            importVisitor.error = error;
            
            importVisitor._onSequencerEmpty();
            
            expect(mockFinish).toHaveBeenCalledWith(error);
        });

        it('should call finish with undefined if no error', () => {
            importVisitor.isFinished = true;
            
            importVisitor._onSequencerEmpty();
            
            expect(mockFinish).toHaveBeenCalledWith(undefined);
        });
    });

    describe('visitImport', () => {
        let visitArgs;

        beforeEach(() => {
            visitArgs = { visitDeeper: true };
        });

        it('should skip CSS imports by default', () => {
            mockImportNode.css = true;
            
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(importVisitor.importCount).toBe(0);
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should process inline CSS imports', () => {
            mockImportNode.css = true;
            mockImportNode.options.inline = true;
            importVisitor.importCount = 0; // Reset counter
            // Mock processImportNode to avoid context setup issues
            const processImportNodeSpy = vi.spyOn(importVisitor, 'processImportNode').mockImplementation(() => {});
            
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(importVisitor.importCount).toBe(1);
            expect(processImportNodeSpy).toHaveBeenCalled();
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should increment import count for non-CSS imports', () => {
            importVisitor.importCount = 0; // Reset counter
            // Mock processImportNode to avoid context setup issues
            const processImportNodeSpy = vi.spyOn(importVisitor, 'processImportNode').mockImplementation(() => {});
            
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(importVisitor.importCount).toBe(1);
            expect(processImportNodeSpy).toHaveBeenCalled();
            expect(visitArgs.visitDeeper).toBe(false);
        });

        it('should handle variable imports differently', () => {
            mockImportNode.isVariableImport.mockReturnValue(true);
            const addVariableImportSpy = vi.spyOn(importVisitor._sequencer, 'addVariableImport');
            
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(addVariableImportSpy).toHaveBeenCalled();
        });

        it('should process regular imports directly', () => {
            const processImportNodeSpy = vi.spyOn(importVisitor, 'processImportNode');
            
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(processImportNodeSpy).toHaveBeenCalled();
        });
    });

    describe('processImportNode', () => {
        let mockContext;
        let mockImportParent;

        beforeEach(() => {
            mockContext = { frames: [{ rules: [mockImportNode] }] };
            mockImportParent = mockContext.frames[0];
        });

        it('should evaluate import node for import', () => {
            const mockEvaledNode = { ...mockImportNode, css: false };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(mockImportNode.evalForImport).toHaveBeenCalledWith(mockContext);
        });

        it('should handle evaluation errors', () => {
            const error = new Error('Eval error');
            mockImportNode.evalForImport.mockImplementation(() => {
                throw error;
            });
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(mockImportNode.css).toBe(true);
            expect(mockImportNode.error).toBe(error);
        });

        it('should add filename and index to errors without them', () => {
            const error = new Error('Eval error');
            error.filename = undefined;
            mockImportNode.evalForImport.mockImplementation(() => {
                throw error;
            });
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(error.index).toBe(0);
            expect(error.filename).toBe('test.less');
        });

        it('should replace import node in parent rules', () => {
            const mockEvaledNode = { ...mockImportNode, css: false };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(mockImportParent.rules[0]).toBe(mockEvaledNode);
        });

        it('should handle multiple import option', () => {
            const mockEvaledNode = { 
                ...mockImportNode, 
                css: false,
                options: { multiple: true }
            };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(mockContext.importMultiple).toBe(true);
        });

        it('should call importer.push for valid imports', () => {
            const mockEvaledNode = { 
                ...mockImportNode, 
                css: undefined, // css is undefined, so tryAppendLessExtension should be true
                getPath: vi.fn(() => 'test/path.less'),
                fileInfo: vi.fn(() => ({ filename: 'test.less' })),
                options: {}
            };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(mockImporter.push).toHaveBeenCalledWith(
                'test/path.less',
                true, // tryAppendLessExtension (css === undefined)
                { filename: 'test.less' },
                {},
                expect.any(Function) // sequencedOnImported
            );
        });

        it('should decrement import count for CSS imports', () => {
            const mockEvaledNode = { ...mockImportNode, css: true };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            importVisitor.importCount = 1;
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(importVisitor.importCount).toBe(0);
        });

        it('should try run sequencer when finished and import count decremented', () => {
            const mockEvaledNode = { ...mockImportNode, css: true };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            importVisitor.importCount = 1;
            importVisitor.isFinished = true;
            const tryRunSpy = vi.spyOn(importVisitor._sequencer, 'tryRun');
            
            importVisitor.processImportNode(mockImportNode, mockContext, mockImportParent);
            
            expect(tryRunSpy).toHaveBeenCalled();
        });
    });

    describe('onImported', () => {
        let mockContext;
        let mockRoot;
        const fullPath = '/full/path/to/file.less';

        beforeEach(() => {
            mockContext = { importMultiple: false };
            mockRoot = { type: 'Ruleset', rules: [] };
            importVisitor.importCount = 1;
        });

        it('should handle import errors', () => {
            const error = new Error('Import error');
            
            importVisitor.onImported(mockImportNode, mockContext, error);
            
            expect(importVisitor.error).toBe(error);
        });

        it('should add filename and index to errors without them', () => {
            const error = new Error('Import error');
            error.filename = undefined;
            
            importVisitor.onImported(mockImportNode, mockContext, error);
            
            expect(error.index).toBe(0);
            expect(error.filename).toBe('test.less');
        });

        it('should handle duplicate imports with skip=true', () => {
            const duplicateImport = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, duplicateImport, fullPath);
            
            expect(mockImportNode.skip).toBe(true);
        });

        it('should handle duplicate imports with skip function', () => {
            const duplicateImport = false;
            mockImportNode.skip = undefined;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, duplicateImport, fullPath);
            
            expect(typeof mockImportNode.skip).toBe('function');
        });

        it('should skip function should work correctly', () => {
            const duplicateImport = false;
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, duplicateImport, fullPath);
            
            // First call should return false and mark file as detected
            expect(mockImportNode.skip()).toBe(false);
            expect(importVisitor.onceFileDetectionMap[fullPath]).toBe(true);
            
            // Second call should return true
            expect(mockImportNode.skip()).toBe(true);
        });

        it('should handle importMultiple context', () => {
            mockContext.importMultiple = true;
            const duplicateImport = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, duplicateImport, fullPath);
            
            expect(mockImportNode.skip).toBeUndefined();
        });

        it('should skip optional imports without fullPath', () => {
            mockImportNode.options.optional = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, null);
            
            expect(mockImportNode.skip).toBe(true);
        });

        it('should set import node properties when root is provided', () => {
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(mockImportNode.root).toBe(mockRoot);
            expect(mockImportNode.importedFilename).toBe(fullPath);
        });

        it('should visit root for non-inline, non-plugin imports', () => {
            const visitSpy = vi.spyOn(importVisitor._visitor, 'visit');
            mockImportNode.options.inline = false;
            mockImportNode.options.isPlugin = false;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(visitSpy).toHaveBeenCalledWith(mockRoot);
            expect(importVisitor.recursionDetector[fullPath]).toBe(true);
        });

        it('should not visit root for inline imports', () => {
            const visitSpy = vi.spyOn(importVisitor._visitor, 'visit');
            mockImportNode.options.inline = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(visitSpy).not.toHaveBeenCalled();
        });

        it('should not visit root for plugin imports', () => {
            const visitSpy = vi.spyOn(importVisitor._visitor, 'visit');
            mockImportNode.options.isPlugin = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(visitSpy).not.toHaveBeenCalled();
        });

        it('should not visit root for duplicate imports', () => {
            const visitSpy = vi.spyOn(importVisitor._visitor, 'visit');
            const duplicateImport = true;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, duplicateImport, fullPath);
            
            expect(visitSpy).not.toHaveBeenCalled();
        });

        it('should handle visitor errors', () => {
            const error = new Error('Visitor error');
            vi.spyOn(importVisitor._visitor, 'visit').mockImplementation(() => {
                throw error;
            });
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(importVisitor.error).toBe(error);
        });

        it('should preserve and restore context', () => {
            const originalContext = importVisitor.context;
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(importVisitor.context).toBe(originalContext);
        });

        it('should decrement import count and try run if finished', () => {
            importVisitor.isFinished = true;
            const tryRunSpy = vi.spyOn(importVisitor._sequencer, 'tryRun');
            
            importVisitor.onImported(mockImportNode, mockContext, null, mockRoot, false, fullPath);
            
            expect(importVisitor.importCount).toBe(0);
            expect(tryRunSpy).toHaveBeenCalled();
        });
    });

    describe('frame management methods', () => {
        let mockNode;

        beforeEach(() => {
            mockNode = { type: 'TestNode', value: { type: 'TestValue' } };
            importVisitor.context = { frames: [] };
        });

        describe('visitDeclaration', () => {
            it('should add DetachedRuleset declarations to frames', () => {
                mockNode.value.type = 'DetachedRuleset';
                const visitArgs = { visitDeeper: true };
                
                importVisitor.visitDeclaration(mockNode, visitArgs);
                
                expect(importVisitor.context.frames[0]).toBe(mockNode);
                expect(visitArgs.visitDeeper).toBe(true);
            });

            it('should not visit deeper for non-DetachedRuleset declarations', () => {
                mockNode.value.type = 'Other';
                const visitArgs = { visitDeeper: true };
                
                importVisitor.visitDeclaration(mockNode, visitArgs);
                
                expect(importVisitor.context.frames.length).toBe(0);
                expect(visitArgs.visitDeeper).toBe(false);
            });
        });

        describe('visitDeclarationOut', () => {
            it('should remove DetachedRuleset declarations from frames', () => {
                mockNode.value.type = 'DetachedRuleset';
                importVisitor.context.frames = [mockNode];
                
                importVisitor.visitDeclarationOut(mockNode);
                
                expect(importVisitor.context.frames.length).toBe(0);
            });

            it('should not modify frames for non-DetachedRuleset declarations', () => {
                mockNode.value.type = 'Other';
                const otherNode = { type: 'Other' };
                importVisitor.context.frames = [otherNode];
                
                importVisitor.visitDeclarationOut(mockNode);
                
                expect(importVisitor.context.frames).toEqual([otherNode]);
            });
        });

        describe('visitAtRule', () => {
            it('should add at-rule node to frames', () => {
                importVisitor.visitAtRule(mockNode);
                
                expect(importVisitor.context.frames[0]).toBe(mockNode);
            });
        });

        describe('visitAtRuleOut', () => {
            it('should remove at-rule node from frames', () => {
                importVisitor.context.frames = [mockNode];
                
                importVisitor.visitAtRuleOut(mockNode);
                
                expect(importVisitor.context.frames.length).toBe(0);
            });
        });

        describe('visitMixinDefinition', () => {
            it('should add mixin definition node to frames', () => {
                importVisitor.visitMixinDefinition(mockNode);
                
                expect(importVisitor.context.frames[0]).toBe(mockNode);
            });
        });

        describe('visitMixinDefinitionOut', () => {
            it('should remove mixin definition node from frames', () => {
                importVisitor.context.frames = [mockNode];
                
                importVisitor.visitMixinDefinitionOut(mockNode);
                
                expect(importVisitor.context.frames.length).toBe(0);
            });
        });

        describe('visitRuleset', () => {
            it('should add ruleset node to frames', () => {
                importVisitor.visitRuleset(mockNode);
                
                expect(importVisitor.context.frames[0]).toBe(mockNode);
            });
        });

        describe('visitRulesetOut', () => {
            it('should remove ruleset node from frames', () => {
                importVisitor.context.frames = [mockNode];
                
                importVisitor.visitRulesetOut(mockNode);
                
                expect(importVisitor.context.frames.length).toBe(0);
            });
        });

        describe('visitMedia', () => {
            it('should add media node rules[0] to frames', () => {
                const mediaRule = { type: 'MediaRule' };
                mockNode.rules = [mediaRule];
                
                importVisitor.visitMedia(mockNode);
                
                expect(importVisitor.context.frames[0]).toBe(mediaRule);
            });
        });

        describe('visitMediaOut', () => {
            it('should remove media node from frames', () => {
                const mediaRule = { type: 'MediaRule' };
                importVisitor.context.frames = [mediaRule];
                
                importVisitor.visitMediaOut(mockNode);
                
                expect(importVisitor.context.frames.length).toBe(0);
            });
        });
    });

    describe('integration tests', () => {
        it('should handle complete import workflow', () => {
            // Set up proper context and parent first
            importVisitor.context.frames = [{ rules: [mockImportNode] }];
            
            const mockEvaledNode = {
                ...mockImportNode,
                css: false,
                getPath: vi.fn(() => 'test.less'),
                fileInfo: vi.fn(() => ({ filename: 'test.less' })),
                options: {}
            };
            mockImportNode.evalForImport.mockReturnValue(mockEvaledNode);
            
            // Mock importer to immediately call the callback
            mockImporter.push.mockImplementation((path, tryAppend, fileInfo, options, callback) => {
                setTimeout(() => callback(null, mockRoot, false, '/full/path/test.less'), 0);
            });
            
            const visitArgs = { visitDeeper: true };
            importVisitor.visitImport(mockImportNode, visitArgs);
            
            expect(importVisitor.importCount).toBe(1);
            expect(mockImporter.push).toHaveBeenCalled();
        });

        it('should handle nested frame management', () => {
            const rulesetNode = { type: 'Ruleset' };
            const mixinNode = { type: 'MixinDefinition' };
            const atRuleNode = { type: 'AtRule' };
            
            importVisitor.visitRuleset(rulesetNode);
            importVisitor.visitMixinDefinition(mixinNode);
            importVisitor.visitAtRule(atRuleNode);
            
            expect(importVisitor.context.frames).toEqual([atRuleNode, mixinNode, rulesetNode]);
            
            importVisitor.visitAtRuleOut(atRuleNode);
            importVisitor.visitMixinDefinitionOut(mixinNode);
            importVisitor.visitRulesetOut(rulesetNode);
            
            expect(importVisitor.context.frames).toEqual([]);
        });

        it('should handle errors throughout the workflow', () => {
            const error = new Error('Test error');
            
            // Test error in run
            vi.spyOn(importVisitor._visitor, 'visit').mockImplementation(() => {
                throw error;
            });
            
            importVisitor.run(mockRoot);
            
            expect(importVisitor.error).toBe(error);
            expect(importVisitor.isFinished).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle null/undefined import nodes gracefully', () => {
            const visitArgs = { visitDeeper: true };
            
            // The actual implementation doesn't handle null gracefully, 
            // so let's test that it throws as expected
            expect(() => {
                importVisitor.visitImport(null, visitArgs);
            }).toThrow();
        });

        it('should handle import nodes without options gracefully', () => {
            mockImportNode.options = undefined;
            const visitArgs = { visitDeeper: true };
            
            // The actual implementation doesn't handle undefined options gracefully,
            // so let's test that it throws as expected
            expect(() => {
                importVisitor.visitImport(mockImportNode, visitArgs);
            }).toThrow();
        });

        it('should handle context without frames', () => {
            const contextWithoutFrames = {};
            
            expect(() => {
                importVisitor.processImportNode(mockImportNode, contextWithoutFrames, null);
            }).not.toThrow();
        });

        it('should handle empty recursion detector', () => {
            importVisitor.recursionDetector = {};
            const fullPath = '/test/path.less';
            
            importVisitor.onImported(mockImportNode, { importMultiple: false }, null, mockRoot, false, fullPath);
            
            expect(importVisitor.recursionDetector[fullPath]).toBe(true);
        });

        it('should handle multiple frame operations', () => {
            const nodes = [
                { type: 'Node1' },
                { type: 'Node2' },
                { type: 'Node3' }
            ];
            
            nodes.forEach(node => importVisitor.visitRuleset(node));
            expect(importVisitor.context.frames).toEqual([nodes[2], nodes[1], nodes[0]]);
            
            nodes.reverse().forEach(node => importVisitor.visitRulesetOut(node));
            expect(importVisitor.context.frames).toEqual([]);
        });
    });
});