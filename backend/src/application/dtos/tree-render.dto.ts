/**
 * TreeRenderDTO v1
 *
 * Represents the structural output of getTreeRenderData(treeId).
 * Suitable for tree visualization on the frontend.
 *
 * Guarantees:
 * - Nodes and edges represent a best-effort structural snapshot of the authorized aggregate.
 * - Output is deterministic per snapshot.
 * - No ordering guarantee on arrays.
 *
 * Non-Guarantees:
 * - No derived computations (generation, ancestry, transitive closure).
 * - No layout coordinates or visual metadata.
 * - Cycles, dangling references, or duplicates may exist and must be handled gracefully.
 */
export interface TreeRenderDTO {
  /**
   * Contract version. Allows frontend to validate compatibility.
   */
  version: 'v1';

  /**
   * Tree identifier (matches request parameter).
   */
  treeId: string;

  /**
   * Array of persons in the tree.
   * No ordering guarantee. Frontend must impose ordering for presentation.
   */
  nodes: TreeNode[];

  /**
   * Array of explicit spouse relationships (undirected).
   * No ordering guarantee. No uniqueness guarantee; duplicate edges may exist.
   */
  spouseEdges: RelationshipEdge[];

  /**
   * Array of explicit parent-child relationships (directed parent → child).
   * No ordering guarantee. Transitive closure not computed.
   */
  parentChildEdges: RelationshipEdge[];
}

/**
 * TreeNode v1
 *
 * Represents a person in the genealogy graph.
 */
export interface TreeNode {
  /**
   * Stable person identifier within the tree.
   * Use for edge references and identity only.
   */
  id: string;

  /**
   * Display name (opaque, server-defined, non-stable).
   * For presentation only. Must not be used for identity, sorting, or business logic.
   */
  displayName: string;
}

/**
 * RelationshipEdge v1
 *
 * Represents an explicit relationship between two persons.
 */
export interface RelationshipEdge {
  /**
   * First person identifier.
   * For spouse edges: no ordering semantics (edge is symmetric).
   * For parent-child edges: parent side of the relationship.
   */
  personAId: string;

  /**
   * Second person identifier.
   * For spouse edges: no ordering semantics.
   * For parent-child edges: child side of the relationship.
   */
  personBId: string;
}
