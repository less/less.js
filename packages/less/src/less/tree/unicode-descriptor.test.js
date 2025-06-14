import { describe, it, expect, beforeEach, vi } from 'vitest';
import UnicodeDescriptor from './unicode-descriptor';
import Node from './node';

describe('UnicodeDescriptor Constructor and Basic Properties', () => {
    it('should create a UnicodeDescriptor with a value', () => {
        const descriptor = new UnicodeDescriptor('U+1F600');
        expect(descriptor.value).toBe('U+1F600');
    });

    it('should create a UnicodeDescriptor with string value', () => {
        const descriptor = new UnicodeDescriptor('emoji-smile');
        expect(descriptor.value).toBe('emoji-smile');
    });

    it('should create a UnicodeDescriptor with numeric value', () => {
        const descriptor = new UnicodeDescriptor(128512);
        expect(descriptor.value).toBe(128512);
    });

    it('should create a UnicodeDescriptor with null value', () => {
        const descriptor = new UnicodeDescriptor(null);
        expect(descriptor.value).toBeNull();
    });

    it('should create a UnicodeDescriptor with undefined value', () => {
        const descriptor = new UnicodeDescriptor(undefined);
        expect(descriptor.value).toBeUndefined();
    });

    it('should create a UnicodeDescriptor with empty string value', () => {
        const descriptor = new UnicodeDescriptor('');
        expect(descriptor.value).toBe('');
    });

    it('should create a UnicodeDescriptor with object value', () => {
        const objValue = { unicode: 'U+1F600', name: 'smile' };
        const descriptor = new UnicodeDescriptor(objValue);
        expect(descriptor.value).toBe(objValue);
    });
});

describe('UnicodeDescriptor Type Property', () => {
    it('should have type property set to "UnicodeDescriptor"', () => {
        const descriptor = new UnicodeDescriptor('test');
        expect(descriptor.type).toBe('UnicodeDescriptor');
    });

    it('should maintain type property after instantiation', () => {
        const descriptor1 = new UnicodeDescriptor('value1');
        const descriptor2 = new UnicodeDescriptor('value2');
        expect(descriptor1.type).toBe('UnicodeDescriptor');
        expect(descriptor2.type).toBe('UnicodeDescriptor');
    });
});

describe('UnicodeDescriptor Inheritance from Node', () => {
    let descriptor;

    beforeEach(() => {
        descriptor = new UnicodeDescriptor('test-value');
    });

    it('should inherit from Node', () => {
        expect(descriptor instanceof Node).toBe(true);
    });

    it('should have Node properties initialized', () => {
        expect(descriptor.parent).toBeNull();
        expect(descriptor.visibilityBlocks).toBeUndefined();
        expect(descriptor.nodeVisible).toBeUndefined();
        expect(descriptor.rootNode).toBeNull();
        expect(descriptor.parsed).toBeNull();
    });

    it('should have access to Node methods', () => {
        expect(typeof descriptor.setParent).toBe('function');
        expect(typeof descriptor.getIndex).toBe('function');
        expect(typeof descriptor.fileInfo).toBe('function');
        expect(typeof descriptor.toCSS).toBe('function');
        expect(typeof descriptor.genCSS).toBe('function');
        expect(typeof descriptor.eval).toBe('function');
        expect(typeof descriptor.accept).toBe('function');
        expect(typeof descriptor.isRulesetLike).toBe('function');
    });

    it('should inherit Node getter properties', () => {
        expect(descriptor.index).toBe(0);
        expect(descriptor.currentFileInfo).toEqual({});
    });
});

describe('UnicodeDescriptor CSS Generation', () => {
    it('should generate CSS using inherited toCSS method', () => {
        const descriptor = new UnicodeDescriptor('U+1F600');
        expect(descriptor.toCSS({})).toBe('U+1F600');
    });

    it('should generate CSS with string value', () => {
        const descriptor = new UnicodeDescriptor('unicode-descriptor');
        expect(descriptor.toCSS({})).toBe('unicode-descriptor');
    });

    it('should generate CSS with numeric value', () => {
        const descriptor = new UnicodeDescriptor(12345);
        expect(descriptor.toCSS({})).toBe('12345');
    });

    it('should handle genCSS method correctly', () => {
        const descriptor = new UnicodeDescriptor('test-unicode');
        const output = {
            add: vi.fn(),
            isEmpty: () => false
        };
        descriptor.genCSS({}, output);
        expect(output.add).toHaveBeenCalledWith('test-unicode');
    });

    it('should handle empty genCSS output', () => {
        const descriptor = new UnicodeDescriptor('');
        const output = {
            add: vi.fn(),
            isEmpty: () => true
        };
        descriptor.genCSS({}, output);
        expect(output.add).toHaveBeenCalledWith('');
    });
});

describe('UnicodeDescriptor Evaluation', () => {
    it('should return itself when evaluated', () => {
        const descriptor = new UnicodeDescriptor('test');
        expect(descriptor.eval()).toBe(descriptor);
    });

    it('should return itself when evaluated with context', () => {
        const descriptor = new UnicodeDescriptor('test');
        const context = { some: 'context' };
        expect(descriptor.eval(context)).toBe(descriptor);
    });
});

describe('UnicodeDescriptor Visitor Pattern', () => {
    it('should accept visitor and update value', () => {
        const descriptor = new UnicodeDescriptor('original');
        const visitor = {
            visit: (val) => val + '-visited'
        };
        descriptor.accept(visitor);
        expect(descriptor.value).toBe('original-visited');
    });

    it('should handle visitor with complex transformation', () => {
        const descriptor = new UnicodeDescriptor('U+1F600');
        const visitor = {
            visit: (val) => val.replace('U+', '\\')
        };
        descriptor.accept(visitor);
        expect(descriptor.value).toBe('\\1F600');
    });

    it('should handle visitor that returns different type', () => {
        const descriptor = new UnicodeDescriptor('123');
        const visitor = {
            visit: (val) => parseInt(val, 10)
        };
        descriptor.accept(visitor);
        expect(descriptor.value).toBe(123);
    });
});

describe('UnicodeDescriptor Parent-Child Relationships', () => {
    it('should set parent using inherited setParent method', () => {
        const parent = new UnicodeDescriptor('parent');
        const child = new UnicodeDescriptor('child');
        child.setParent(child, parent);
        expect(child.parent).toBe(parent);
    });

    it('should handle array of UnicodeDescriptors in setParent', () => {
        const parent = new UnicodeDescriptor('parent');
        const children = [
            new UnicodeDescriptor('child1'),
            new UnicodeDescriptor('child2')
        ];
        children[0].setParent(children, parent);
        children.forEach((child) => {
            expect(child.parent).toBe(parent);
        });
    });
});

describe('UnicodeDescriptor Index and FileInfo', () => {
    it('should return correct index from parent', () => {
        const parent = new UnicodeDescriptor('parent');
        const child = new UnicodeDescriptor('child');
        parent._index = 5;
        child.parent = parent;
        expect(child.getIndex()).toBe(5);
    });

    it('should return fileInfo from parent', () => {
        const parent = new UnicodeDescriptor('parent');
        const child = new UnicodeDescriptor('child');
        const fileInfo = { filename: 'test.less', line: 10 };
        parent._fileInfo = fileInfo;
        child.parent = parent;
        expect(child.fileInfo()).toEqual(fileInfo);
    });

    it('should return default values when no parent', () => {
        const descriptor = new UnicodeDescriptor('test');
        expect(descriptor.getIndex()).toBe(0);
        expect(descriptor.fileInfo()).toEqual({});
    });
});

describe('UnicodeDescriptor Visibility Management', () => {
    let descriptor;

    beforeEach(() => {
        descriptor = new UnicodeDescriptor('test');
    });

    it('should handle visibility blocks correctly', () => {
        expect(descriptor.blocksVisibility()).toBe(false);
        descriptor.addVisibilityBlock();
        expect(descriptor.blocksVisibility()).toBe(true);
        descriptor.removeVisibilityBlock();
        expect(descriptor.blocksVisibility()).toBe(false);
    });

    it('should handle visibility state correctly', () => {
        descriptor.ensureVisibility();
        expect(descriptor.isVisible()).toBe(true);
        descriptor.ensureInvisibility();
        expect(descriptor.isVisible()).toBe(false);
    });

    it('should copy visibility info from another descriptor', () => {
        const source = new UnicodeDescriptor('source');
        source.addVisibilityBlock();
        source.ensureVisibility();

        descriptor.copyVisibilityInfo(source.visibilityInfo());
        expect(descriptor.visibilityBlocks).toBe(1);
        expect(descriptor.nodeVisible).toBe(true);
    });
});

describe('UnicodeDescriptor Arithmetic Operations', () => {
    let descriptor;

    beforeEach(() => {
        descriptor = new UnicodeDescriptor('test');
    });

    it('should perform arithmetic operations using inherited _operate method', () => {
        expect(descriptor._operate({}, '+', 5, 3)).toBe(8);
        expect(descriptor._operate({}, '-', 10, 4)).toBe(6);
        expect(descriptor._operate({}, '*', 6, 7)).toBe(42);
        expect(descriptor._operate({}, '/', 15, 3)).toBe(5);
    });

    it('should handle floating point rounding', () => {
        expect(descriptor.fround({ numPrecision: 2 }, 3.14159)).toBe(3.14);
        expect(descriptor.fround({ numPrecision: 3 }, 2.71828)).toBe(2.718);
        expect(descriptor.fround(null, 1.23456)).toBe(1.23456);
    });
});

describe('UnicodeDescriptor Other Inherited Methods', () => {
    let descriptor;

    beforeEach(() => {
        descriptor = new UnicodeDescriptor('test');
    });

    it('should return false for isRulesetLike', () => {
        expect(descriptor.isRulesetLike()).toBe(false);
    });

    it('should handle visibility info operations', () => {
        descriptor.addVisibilityBlock();
        descriptor.addVisibilityBlock();
        descriptor.ensureVisibility();

        const info = descriptor.visibilityInfo();
        expect(info.visibilityBlocks).toBe(2);
        expect(info.nodeVisible).toBe(true);

        const newDescriptor = new UnicodeDescriptor('new');
        newDescriptor.copyVisibilityInfo(info);
        expect(newDescriptor.visibilityBlocks).toBe(2);
        expect(newDescriptor.nodeVisible).toBe(true);
    });
});

describe('UnicodeDescriptor Edge Cases', () => {
    it('should handle extremely long unicode values', () => {
        const longValue = 'U+' + '1'.repeat(1000);
        const descriptor = new UnicodeDescriptor(longValue);
        expect(descriptor.value).toBe(longValue);
        expect(descriptor.toCSS()).toBe(longValue);
    });

    it('should handle special characters in unicode values', () => {
        const specialValue = 'U+1F600;emoji:smile';
        const descriptor = new UnicodeDescriptor(specialValue);
        expect(descriptor.value).toBe(specialValue);
        expect(descriptor.toCSS()).toBe(specialValue);
    });

    it('should handle array values', () => {
        const arrayValue = ['U+1F600', 'U+1F601', 'U+1F602'];
        const descriptor = new UnicodeDescriptor(arrayValue);
        expect(descriptor.value).toBe(arrayValue);
    });

    it('should handle boolean values', () => {
        const descriptor1 = new UnicodeDescriptor(true);
        const descriptor2 = new UnicodeDescriptor(false);
        expect(descriptor1.value).toBe(true);
        expect(descriptor2.value).toBe(false);
    });

    it('should handle function values', () => {
        const funcValue = () => 'U+1F600';
        const descriptor = new UnicodeDescriptor(funcValue);
        expect(descriptor.value).toBe(funcValue);
    });
});

describe('UnicodeDescriptor Static Methods from Node', () => {
    it('should use Node.compare for comparing UnicodeDescriptors', () => {
        const descriptor1 = new UnicodeDescriptor('test');
        const descriptor2 = new UnicodeDescriptor('test');
        const descriptor3 = new UnicodeDescriptor('different');

        expect(Node.compare(descriptor1, descriptor2)).toBe(0);
        expect(Node.compare(descriptor1, descriptor3)).toBeUndefined();
    });

    it('should use Node.numericCompare for numeric comparisons', () => {
        expect(Node.numericCompare(1, 2)).toBe(-1);
        expect(Node.numericCompare(2, 2)).toBe(0);
        expect(Node.numericCompare(3, 2)).toBe(1);
    });
});

describe('UnicodeDescriptor Constructor Edge Cases', () => {
    it('should handle constructor called without new keyword', () => {
        // This tests that the constructor requires 'new' keyword for proper instantiation
        // When called without 'new', it should fail as expected for constructor functions
        expect(() => {
            UnicodeDescriptor('test');
        }).toThrow("Cannot set properties of undefined (setting 'value')");
    });

    it('should handle multiple arguments (only first should be used)', () => {
        const descriptor = new UnicodeDescriptor('first', 'second', 'third');
        expect(descriptor.value).toBe('first');
    });

    it('should handle no arguments', () => {
        const descriptor = new UnicodeDescriptor();
        expect(descriptor.value).toBeUndefined();
    });
});
