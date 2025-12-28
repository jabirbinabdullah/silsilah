/**
 * Unit tests for buildGenealogyHierarchy
 * 
 * @module genealogyHierarchy.test
 * @pure No mocks, no snapshots, structural assertions only
 */

import { describe, it, expect } from 'vitest';
import {
  buildGenealogyHierarchy,
  GenealogyHierarchyResult,
  GenealogyHierarchyNode,
} from './genealogyHierarchy';
import type { TreeRenderV1, RenderNode } from '../api';

// ============================================================================
// TEST: Single Root, Simple Tree
// ============================================================================

describe('buildGenealogyHierarchy', () => {
  it('should build a simple tree with single root (Alice → Bob → Charlie)', () => {
    // Scenario: Alice (root) → Bob (child) → Charlie (grandchild)
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-1',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'bob', target: 'charlie', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Assertions
    expect(result.isSyntheticRoot).toBe(false);
    expect(result.root.personId).toBe('alice');
    expect(result.root.generation).toBe(0);
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('bob');
    expect(result.root.children[0].generation).toBe(1);
    expect(result.root.children[0].children).toHaveLength(1);
    expect(result.root.children[0].children[0].personId).toBe('charlie');
    expect(result.root.children[0].children[0].generation).toBe(2);
    expect(result.brokenEdges).toHaveLength(0);
    expect(result.nodeMap.size).toBe(3);
  });

  // ============================================================================
  // TEST: Multiple Roots → Synthetic Root
  // ============================================================================

  it('should create synthetic root for multiple disconnected families', () => {
    // Scenario: Alice → Bob (family 1), Diana → Eve (family 2), Frank (orphan)
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-2',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'diana', displayName: 'Diana' },
        { id: 'eve', displayName: 'Eve' },
        { id: 'frank', displayName: 'Frank' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'diana', target: 'eve', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Assertions
    expect(result.isSyntheticRoot).toBe(true);
    expect(result.root.personId).toBe('__synthetic_root__');
    expect(result.root.generation).toBe(-1);
    expect(result.root.children).toHaveLength(3); // Alice, Diana, Frank
    
    const rootChildren = result.root.children.map(c => c.personId).sort();
    expect(rootChildren).toEqual(['alice', 'diana', 'frank']);
    
    // Verify each family tree
    const aliceNode = result.root.children.find(c => c.personId === 'alice');
    expect(aliceNode?.children).toHaveLength(1);
    expect(aliceNode?.children[0].personId).toBe('bob');
    
    const dianaNode = result.root.children.find(c => c.personId === 'diana');
    expect(dianaNode?.children).toHaveLength(1);
    expect(dianaNode?.children[0].personId).toBe('eve');
    
    const frankNode = result.root.children.find(c => c.personId === 'frank');
    expect(frankNode?.children).toHaveLength(0);
    
    expect(result.brokenEdges).toHaveLength(0);
    expect(result.nodeMap.size).toBe(5);
  });

  // ============================================================================
  // TEST: Missing Parent References
  // ============================================================================

  it('should handle missing parent references as roots', () => {
    // Scenario: Bob has parent edge to Alice, but Alice doesn't exist in nodes
    // Bob should be treated as a root since Alice is missing
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-3',
      nodes: [
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' }, // alice missing
        { id: 'e2', source: 'bob', target: 'charlie', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Bob should be treated as root since Alice doesn't exist
    expect(result.root.personId).toBe('bob');
    expect(result.root.generation).toBe(0);
    expect(result.root.parents).toEqual(['alice']); // Reference preserved
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('charlie');
    expect(result.nodeMap.size).toBe(2); // Only Bob and Charlie
  });

  // ============================================================================
  // TEST: Parent-Child Cycle
  // ============================================================================

  it('should detect and break parent-child cycles defensively', () => {
    // Scenario: Alice → Bob → Charlie → Alice (cycle back to Alice)
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-4',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'bob', target: 'charlie', type: 'parent-child' },
        { id: 'e3', source: 'charlie', target: 'alice', type: 'parent-child' }, // CYCLE!
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Root should be Alice (detected as root since cycle edge is cut)
    expect(result.root.personId).toBe('alice');
    expect(result.root.generation).toBe(0);
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('bob');
    expect(result.root.children[0].children).toHaveLength(1);
    expect(result.root.children[0].children[0].personId).toBe('charlie');
    
    // Charlie should NOT have Alice as a child (edge cut)
    expect(result.root.children[0].children[0].children).toHaveLength(0);
    
    // Cycle should be logged as broken edge
    expect(result.brokenEdges).toHaveLength(1);
    expect(result.brokenEdges[0].reason).toBe('cycle');
    expect(result.brokenEdges[0].childId).toBe('alice');
    expect(result.brokenEdges[0].message).toContain('Cycle detected');
  });

  // ============================================================================
  // TEST: Self-Referencing Edge
  // ============================================================================

  it('should detect and break self-referencing edges', () => {
    // Scenario: Alice → Alice (self-loop)
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-5',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'alice', type: 'parent-child' }, // SELF-LOOP!
        { id: 'e2', source: 'alice', target: 'bob', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Alice should be root
    expect(result.root.personId).toBe('alice');
    expect(result.root.generation).toBe(0);
    
    // Alice should only have Bob as child, NOT itself
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('bob');
    
    // Self-loop should be logged as broken edge
    expect(result.brokenEdges).toHaveLength(1);
    expect(result.brokenEdges[0].reason).toBe('cycle');
    expect(result.brokenEdges[0].childId).toBe('alice');
  });

  // ============================================================================
  // TEST: Spouse Relationships Preserved (Not Hierarchical)
  // ============================================================================

  it('should preserve spouse relationships as lateral metadata, not hierarchy', () => {
    // Scenario: Alice married to Bob, both are parents of Charlie
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-6',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'spouse' }, // Spouse relationship
        { id: 'e2', source: 'alice', target: 'charlie', type: 'parent-child' },
        { id: 'e3', source: 'bob', target: 'charlie', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Alice and Bob should both be roots (no parents)
    expect(result.isSyntheticRoot).toBe(true);
    expect(result.root.children).toHaveLength(2);
    
    // Find Alice and Bob nodes
    const aliceNode = result.nodeMap.get('alice');
    const bobNode = result.nodeMap.get('bob');
    
    expect(aliceNode).toBeDefined();
    expect(bobNode).toBeDefined();
    
    // Spouse relationships should be in metadata, not children
    expect(aliceNode?.spouses).toContain('bob');
    expect(bobNode?.spouses).toContain('alice');
    
    // Alice and Bob should NOT be in each other's children array
    expect(aliceNode?.children.some(c => c.personId === 'bob')).toBe(false);
    expect(bobNode?.children.some(c => c.personId === 'alice')).toBe(false);
    
    // Both should have Charlie as child
    expect(aliceNode?.children.some(c => c.personId === 'charlie')).toBe(true);
    expect(bobNode?.children.some(c => c.personId === 'charlie')).toBe(true);
  });

  // ============================================================================
  // TEST: rootPersonId Option
  // ============================================================================

  it('should build hierarchy from specified rootPersonId', () => {
    // Scenario: Alice → Bob → Charlie, but we want Bob as root
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-7',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'bob', target: 'charlie', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto, { rootPersonId: 'bob' });

    // Bob should be the root (even though Alice is the natural root)
    expect(result.root.personId).toBe('bob');
    expect(result.root.generation).toBe(0);
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('charlie');
    
    // Alice should NOT be in the hierarchy (above Bob)
    expect(result.nodeMap.has('alice')).toBe(false);
  });

  // ============================================================================
  // TEST: Empty Tree
  // ============================================================================

  it('should handle empty tree gracefully', () => {
    // Scenario: No nodes
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-8',
      nodes: [],
      edges: [],
    };

    const result = buildGenealogyHierarchy(dto);

    // Should create empty root
    expect(result.root.personId).toBe('__empty_root__');
    expect(result.root.children).toHaveLength(0);
    expect(result.nodeMap.size).toBe(0);
    expect(result.generations).toHaveLength(0);
    expect(result.brokenEdges).toHaveLength(0);
  });

  // ============================================================================
  // TEST: Generation Metadata
  // ============================================================================

  it('should build correct generation metadata', () => {
    // Scenario: 3 generations with varying counts
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-9',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
        { id: 'david', displayName: 'David' },
        { id: 'eve', displayName: 'Eve' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'alice', target: 'charlie', type: 'parent-child' },
        { id: 'e3', source: 'bob', target: 'david', type: 'parent-child' },
        { id: 'e4', source: 'charlie', target: 'eve', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Generation 0: Alice (1 person)
    // Generation 1: Bob, Charlie (2 persons)
    // Generation 2: David, Eve (2 persons)
    expect(result.generations).toHaveLength(3);
    
    const gen0 = result.generations.find(g => g.level === 0);
    expect(gen0?.count).toBe(1);
    expect(gen0?.personIds).toEqual(['alice']);
    
    const gen1 = result.generations.find(g => g.level === 1);
    expect(gen1?.count).toBe(2);
    expect(gen1?.personIds.sort()).toEqual(['bob', 'charlie']);
    
    const gen2 = result.generations.find(g => g.level === 2);
    expect(gen2?.count).toBe(2);
    expect(gen2?.personIds.sort()).toEqual(['david', 'eve']);
  });

  // ============================================================================
  // TEST: Legacy Format Compatibility
  // ============================================================================

  it('should handle legacy edge format (spouseEdges/parentChildEdges arrays)', () => {
    // Scenario: Using old format with separate arrays
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-10',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
      ],
      edges: [], // Empty new format
      spouseEdges: [
        { personAId: 'alice', personBId: 'bob' },
      ],
      parentChildEdges: [
        { personAId: 'alice', personBId: 'bob' }, // This should take precedence
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Alice should be root
    expect(result.root.personId).toBe('alice');
    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].personId).toBe('bob');
    
    // Spouse relationship should still be preserved
    expect(result.root.spouses).toContain('bob');
  });

  // ============================================================================
  // TEST: Complex Cycle (Diamond + Cycle)
  // ============================================================================

  it('should handle complex cycles in diamond structures', () => {
    // Scenario: Alice → Bob, Alice → Charlie, Bob → David, Charlie → David (diamond)
    // Then David → Bob (cycle back)
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-11',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
        { id: 'charlie', displayName: 'Charlie' },
        { id: 'david', displayName: 'David' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'alice', target: 'charlie', type: 'parent-child' },
        { id: 'e3', source: 'bob', target: 'david', type: 'parent-child' },
        { id: 'e4', source: 'charlie', target: 'david', type: 'parent-child' },
        { id: 'e5', source: 'david', target: 'bob', type: 'parent-child' }, // CYCLE!
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // Alice should be root
    expect(result.root.personId).toBe('alice');
    expect(result.root.children).toHaveLength(2);
    
    // Cycle edge should be broken
    expect(result.brokenEdges.length).toBeGreaterThan(0);
    expect(result.brokenEdges.some(e => e.reason === 'cycle')).toBe(true);
    
    // David should not have Bob as child (cycle edge cut)
    const davidNode = result.nodeMap.get('david');
    expect(davidNode?.children.some(c => c.personId === 'bob')).toBe(false);
  });

  // ============================================================================
  // TEST: NodeMap Correctness
  // ============================================================================

  it('should populate nodeMap with correct references', () => {
    // Scenario: Simple tree to verify nodeMap integrity
    const dto: TreeRenderV1 = {
      version: 'v1',
      treeId: 'test-tree-12',
      nodes: [
        { id: 'alice', displayName: 'Alice' },
        { id: 'bob', displayName: 'Bob' },
      ],
      edges: [
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
      ],
    };

    const result = buildGenealogyHierarchy(dto);

    // NodeMap should contain all nodes
    expect(result.nodeMap.size).toBe(2);
    expect(result.nodeMap.has('alice')).toBe(true);
    expect(result.nodeMap.has('bob')).toBe(true);
    
    // References should match hierarchy structure
    const aliceFromMap = result.nodeMap.get('alice');
    const aliceFromRoot = result.root;
    expect(aliceFromMap).toBe(aliceFromRoot); // Same reference
    
    const bobFromMap = result.nodeMap.get('bob');
    const bobFromHierarchy = result.root.children[0];
    expect(bobFromMap).toBe(bobFromHierarchy); // Same reference
  });
});
