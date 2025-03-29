import { describe, it, expect, beforeEach, vi } from 'vitest';
import Node from './node';

describe('Node Constructor and Basic Properties', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('should initialize with default values', () => {
        expect(node.parent).toBeNull();
        expect(node.visibilityBlocks).toBeUndefined();
        expect(node.nodeVisible).toBeUndefined();
        expect(node.rootNode).toBeNull();
        expect(node.parsed).toBeNull();
    });
});

describe('Node Parent-Child Relationships', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('setParent should set parent for a single node', () => {
        const parentNode = new Node();
        const childNode = new Node();
        childNode.setParent(childNode, parentNode);
        expect(childNode.parent).toBe(parentNode);
    });

    it('setParent should set parent for an array of nodes', () => {
        const parentNode = new Node();
        const childNodes = [new Node(), new Node()];
        node.setParent(childNodes, parentNode);
        childNodes.forEach((child) => {
            expect(child.parent).toBe(parentNode);
        });
    });

    it('setParent should handle non-Node objects gracefully', () => {
        const parentNode = new Node();
        node.setParent({}, parentNode);
        // Should not throw error
    });
});

describe('Node Index and FileInfo', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('getIndex should return 0 when no parent exists', () => {
        expect(node.getIndex()).toBe(0);
    });

    it('getIndex should return parent index when available', () => {
        const parentNode = new Node();
        parentNode._index = 5;
        node.parent = parentNode;
        expect(node.getIndex()).toBe(5);
    });

    it('fileInfo should return empty object when no parent exists', () => {
        expect(node.fileInfo()).toEqual({});
    });

    it('fileInfo should return parent fileInfo when available', () => {
        const parentNode = new Node();
        const fileInfoData = { filename: 'test.less' };
        parentNode._fileInfo = fileInfoData;
        node.parent = parentNode;
        expect(node.fileInfo()).toEqual(fileInfoData);
    });
});

describe('Node CSS Generation', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('toCSS should generate CSS string', () => {
        node.value = 'test-value';
        expect(node.toCSS({})).toBe('test-value');
    });

    it('genCSS should add value to output', () => {
        node.value = 'test-value';
        const output = {
            add: vi.fn(),
            isEmpty: () => false
        };
        node.genCSS({}, output);
        expect(output.add).toHaveBeenCalledWith('test-value');
    });
});

describe('Node Operations', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('_operate should perform basic arithmetic operations', () => {
        expect(node._operate({}, '+', 5, 3)).toBe(8);
        expect(node._operate({}, '-', 5, 3)).toBe(2);
        expect(node._operate({}, '*', 5, 3)).toBe(15);
        expect(node._operate({}, '/', 6, 3)).toBe(2);
    });

    it('fround should round numbers based on precision', () => {
        expect(node.fround({ numPrecision: 2 }, 1.2345)).toBe(1.23);
        expect(node.fround({ numPrecision: 3 }, 1.2345)).toBe(1.235);
        expect(node.fround(null, 1.2345)).toBe(1.2345);
    });
});

describe('Node Static Compare Methods', () => {
    it('compare should handle simple value comparisons', () => {
        const node1 = new Node();
        const node2 = new Node();
        node1.value = 'a';
        node2.value = 'a';
        expect(Node.compare(node1, node2)).toBe(0);
    });

    it('numericCompare should compare numbers correctly', () => {
        expect(Node.numericCompare(1, 2)).toBe(-1);
        expect(Node.numericCompare(2, 2)).toBe(0);
        expect(Node.numericCompare(3, 2)).toBe(1);
    });
});

describe('Node Visibility Management', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('blocksVisibility should initialize and return visibility blocks', () => {
        expect(node.blocksVisibility()).toBe(false);
        node.addVisibilityBlock();
        expect(node.blocksVisibility()).toBe(true);
    });

    it('addVisibilityBlock should increment visibility blocks', () => {
        node.addVisibilityBlock();
        node.addVisibilityBlock();
        expect(node.visibilityBlocks).toBe(2);
    });

    it('removeVisibilityBlock should decrement visibility blocks', () => {
        node.addVisibilityBlock();
        node.addVisibilityBlock();
        node.removeVisibilityBlock();
        expect(node.visibilityBlocks).toBe(1);
    });

    it('ensureVisibility should set nodeVisible to true', () => {
        node.ensureVisibility();
        expect(node.nodeVisible).toBe(true);
    });

    it('ensureInvisibility should set nodeVisible to false', () => {
        node.ensureInvisibility();
        expect(node.nodeVisible).toBe(false);
    });

    it('visibilityInfo should return visibility state', () => {
        node.addVisibilityBlock();
        node.ensureVisibility();
        expect(node.visibilityInfo()).toEqual({
            visibilityBlocks: 1,
            nodeVisible: true
        });
    });

    it('copyVisibilityInfo should copy visibility state from another node', () => {
        const sourceNode = new Node();
        sourceNode.addVisibilityBlock();
        sourceNode.ensureVisibility();

        node.copyVisibilityInfo(sourceNode.visibilityInfo());
        expect(node.visibilityBlocks).toBe(1);
        expect(node.nodeVisible).toBe(true);
    });
});

describe('Node Other Methods', () => {
    let node;

    beforeEach(() => {
        node = new Node();
    });

    it('isRulesetLike should return false', () => {
        expect(node.isRulesetLike()).toBe(false);
    });

    it('eval should return self', () => {
        expect(node.eval()).toBe(node);
    });

    it('accept should visit value with visitor', () => {
        node.value = 'original';
        const visitor = {
            visit: (val) => val + '-visited'
        };
        node.accept(visitor);
        expect(node.value).toBe('original-visited');
    });
});
