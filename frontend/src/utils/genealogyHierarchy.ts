/**
 * Pure function module for building hierarchical genealogy data structures
 * from flat TreeRenderDTO for visualization.
 * 
 * @module genealogyHierarchy
 * @pure No side effects, no mutations, deterministic output
 * @complexity O(N + E) where N = nodes, E = edges
 */

import type { TreeRenderV1, RenderNode } from '../api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Core hierarchy node representing a person in the genealogical tree.
 * Forms the recursive structure for D3 hierarchy visualization.
 */
export interface GenealogyHierarchyNode {
  /** Unique identifier matching RenderNode.id from TreeRenderDTO */
  readonly personId: string;
  
  /** Display name from RenderNode.displayName */
  readonly displayName: string;
  
  /** 
   * Generation level in the hierarchy.
   * 0 = root generation (oldest ancestors with no parents in tree)
   * Increments by 1 for each descendant generation
   */
  readonly generation: number;
  
  /**
   * Array of spouse person IDs at the same generation level.
   * Derived from spouseEdges where this person is involved.
   * Used for horizontal layout grouping, not hierarchical structure.
   */
  readonly spouses: readonly string[];
  
  /**
   * Array of parent person IDs (for context/back-reference).
   * Empty array if this node is a root.
   * Used for cycle detection and relationship navigation.
   */
  readonly parents: readonly string[];
  
  /**
   * Recursive children array forming the hierarchy.
   * Each child is a full GenealogyHierarchyNode with generation = parent.generation + 1
   * This is the primary hierarchical structure for D3.hierarchy()
   */
  readonly children: readonly GenealogyHierarchyNode[];
  
  /**
   * Original RenderNode data from TreeRenderDTO for rendering.
   */
  readonly data: RenderNode;
}

/**
 * Record of edges that were cut during hierarchy construction.
 */
export interface BrokenEdge {
  /** Parent person ID */
  parentId: string;
  
  /** Child person ID */
  childId: string;
  
  /** Reason for breaking: 'cycle' | 'duplicate-parent' */
  reason: 'cycle' | 'duplicate-parent';
  
  /** Human-readable explanation for debugging */
  message: string;
}

/**
 * Generation band metadata for horizontal alignment.
 */
export interface Generation {
  /** Generation level number (0-indexed from roots) */
  level: number;
  
  /** Array of person IDs at this generation level */
  personIds: string[];
  
  /** Count of nodes in this generation */
  count: number;
}

/**
 * Result wrapper containing the hierarchical genealogy tree.
 */
export interface GenealogyHierarchyResult {
  /**
   * Root of the hierarchy tree.
   * If multiple roots exist (disconnected families), this is a synthetic root.
   * If single root, this is the actual root person.
   * If rootPersonId was specified, this is that person's subtree.
   */
  readonly root: GenealogyHierarchyNode;
  
  /**
   * Flat lookup map: personId → GenealogyHierarchyNode reference.
   * Enables O(1) access for selection/navigation.
   */
  readonly nodeMap: ReadonlyMap<string, GenealogyHierarchyNode>;
  
  /**
   * Array of generation levels with metadata.
   * generations[0] = all root-level persons
   * generations[1] = all first-generation children, etc.
   */
  readonly generations: readonly Generation[];
  
  /**
   * Edges that were cut due to cycle detection or other issues.
   * Logged for debugging, not rendered.
   */
  readonly brokenEdges: readonly BrokenEdge[];
  
  /**
   * Whether the root is synthetic (multiple disconnected trees).
   */
  readonly isSyntheticRoot: boolean;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Builds a hierarchical genealogy structure from flat TreeRenderDTO.
 * 
 * @param dto - TreeRenderDTO containing nodes and edges
 * @param options - Optional configuration
 * @param options.rootPersonId - If provided, build hierarchy from this specific person as root
 * @returns GenealogyHierarchyResult with hierarchical structure
 * 
 * @pure No side effects, no input mutation
 * @complexity O(N + E) where N = nodes, E = edges
 * @deterministic Same input always produces same output
 */
export function buildGenealogyHierarchy(
  dto: TreeRenderV1,
  options?: { rootPersonId?: string }
): GenealogyHierarchyResult {
  // Phase 1: Build adjacency maps and collect spouse relationships
  const adjacency = buildAdjacencyMaps(dto);
  
  // Phase 2: Determine roots
  let rootIds: string[];
  if (options?.rootPersonId) {
    rootIds = [options.rootPersonId];
  } else {
    rootIds = findRoots(dto.nodes, adjacency.childToParents, adjacency.nodeDataMap);
    
    // If no roots found (e.g., all nodes in a cycle), pick first node as root
    if (rootIds.length === 0 && dto.nodes.length > 0) {
      rootIds = [dto.nodes[0].id];
    }
  }
  
  // Phase 3: Build hierarchy nodes with cycle detection
  const buildContext: BuildContext = {
    nodeMap: new Map(),
    generations: [],
    brokenEdges: [],
    adjacency,
    visitedGlobal: new Set(),
  };
  
  const rootNodes = rootIds.map(rootId => 
    buildHierarchyNode(rootId, 0, new Set(), buildContext)
  ).filter((node): node is GenealogyHierarchyNode => node !== null);
  
  // Phase 4: Build generation metadata
  const generations = buildGenerationMetadata(buildContext.nodeMap);
  
  // Phase 5: Create root (synthetic if multiple roots)
  const isSyntheticRoot = rootNodes.length > 1;
  const root: GenealogyHierarchyNode = isSyntheticRoot
    ? createSyntheticRoot(rootNodes)
    : rootNodes[0] || createEmptyRoot();
  
  return {
    root,
    nodeMap: buildContext.nodeMap,
    generations,
    brokenEdges: buildContext.brokenEdges,
    isSyntheticRoot,
  };
}

// ============================================================================
// HELPER TYPES AND INTERFACES
// ============================================================================

interface AdjacencyMaps {
  parentToChildren: Map<string, string[]>;
  childToParents: Map<string, string[]>;
  spouseMap: Map<string, string[]>;
  nodeDataMap: Map<string, RenderNode>;
}

interface BuildContext {
  nodeMap: Map<string, GenealogyHierarchyNode>;
  generations: Generation[];
  brokenEdges: BrokenEdge[];
  adjacency: AdjacencyMaps;
  visitedGlobal: Set<string>;
}

// ============================================================================
// PHASE 1: BUILD ADJACENCY MAPS
// ============================================================================

/**
 * Builds adjacency maps from TreeRenderDTO edges.
 * Handles both legacy format (spouseEdges/parentChildEdges) and new format (edges array).
 * 
 * @complexity O(E) where E = number of edges
 */
function buildAdjacencyMaps(dto: TreeRenderV1): AdjacencyMaps {
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const nodeDataMap = new Map<string, RenderNode>();
  
  // Build node data map
  for (const node of dto.nodes) {
    nodeDataMap.set(node.id, node);
  }
  
  // Process edges (prefer new format, fallback to legacy)
  if (dto.edges && dto.edges.length > 0) {
    // New format: unified edges array
    for (const edge of dto.edges) {
      if (edge.type === 'parent-child') {
        addEdge(parentToChildren, edge.source, edge.target);
        addEdge(childToParents, edge.target, edge.source);
      } else if (edge.type === 'spouse') {
        addEdge(spouseMap, edge.source, edge.target);
        addEdge(spouseMap, edge.target, edge.source);
      }
    }
  } else {
    // Legacy format: separate arrays
    if (dto.parentChildEdges) {
      for (const edge of dto.parentChildEdges) {
        addEdge(parentToChildren, edge.personAId, edge.personBId);
        addEdge(childToParents, edge.personBId, edge.personAId);
      }
    }
    if (dto.spouseEdges) {
      for (const edge of dto.spouseEdges) {
        addEdge(spouseMap, edge.personAId, edge.personBId);
        addEdge(spouseMap, edge.personBId, edge.personAId);
      }
    }
  }
  
  return { parentToChildren, childToParents, spouseMap, nodeDataMap };
}

/**
 * Helper to add an edge to adjacency map.
 */
function addEdge(map: Map<string, string[]>, from: string, to: string): void {
  if (!map.has(from)) {
    map.set(from, []);
  }
  map.get(from)!.push(to);
}

// ============================================================================
// PHASE 2: FIND ROOTS
// ============================================================================

/**
 * Finds root nodes (persons with no parents in the tree).
 * Filters out parent references that don't correspond to actual nodes.
 * 
 * @complexity O(N) where N = number of nodes
 */
function findRoots(
  nodes: RenderNode[],
  childToParents: Map<string, string[]>,
  nodeDataMap: Map<string, RenderNode>
): string[] {
  const roots: string[] = [];
  
  for (const node of nodes) {
    const parents = childToParents.get(node.id) || [];
    // Filter out parent IDs that don't exist as actual nodes
    const existingParents = parents.filter(parentId => nodeDataMap.has(parentId));
    
    if (existingParents.length === 0) {
      roots.push(node.id);
    }
  }
  
  return roots;
}

// ============================================================================
// PHASE 3: BUILD HIERARCHY WITH CYCLE DETECTION
// ============================================================================

/**
 * Recursively builds a hierarchy node with defensive cycle detection.
 * 
 * Cycle Handling Strategy:
 * - Maintains a per-path visited set (visitedInPath) to detect cycles in current branch
 * - If a node is re-encountered in the same path → CUT EDGE, log to brokenEdges
 * - Uses global visited set (visitedGlobal) to prevent processing same node multiple times
 * 
 * @param personId - ID of person to build node for
 * @param generation - Current generation level (0 = root)
 * @param visitedInPath - Set of person IDs visited in current path (for cycle detection)
 * @param context - Shared build context with maps and broken edge tracking
 * @returns GenealogyHierarchyNode or null if node data not found
 * 
 * @complexity O(N) amortized per node (each node visited once)
 */
function buildHierarchyNode(
  personId: string,
  generation: number,
  visitedInPath: Set<string>,
  context: BuildContext
): GenealogyHierarchyNode | null {
  // Check for node data existence
  const nodeData = context.adjacency.nodeDataMap.get(personId);
  if (!nodeData) {
    return null;
  }
  
  // CYCLE DETECTION: Check if this person is already in the current path
  if (visitedInPath.has(personId)) {
    // Cycle detected! Cut this edge and return null
    // The caller will skip this child
    const pathArray = Array.from(visitedInPath);
    context.brokenEdges.push({
      parentId: pathArray[pathArray.length - 1] || 'unknown',
      childId: personId,
      reason: 'cycle',
      message: `Cycle detected: ${pathArray.join(' → ')} → ${personId}`,
    });
    return null;
  }
  
  // Check if already processed globally (for multi-parent scenarios)
  if (context.visitedGlobal.has(personId)) {
    // Node already built in another branch - return reference from nodeMap
    return context.nodeMap.get(personId) || null;
  }
  
  // Mark as visited in current path and globally
  const newVisitedInPath = new Set(visitedInPath);
  newVisitedInPath.add(personId);
  context.visitedGlobal.add(personId);
  
  // Get relationships
  const parents = context.adjacency.childToParents.get(personId) || [];
  const spouses = context.adjacency.spouseMap.get(personId) || [];
  const childIds = context.adjacency.parentToChildren.get(personId) || [];
  
  // Recursively build children
  const children: GenealogyHierarchyNode[] = [];
  for (const childId of childIds) {
    const childNode = buildHierarchyNode(
      childId,
      generation + 1,
      newVisitedInPath, // Pass current path context
      context
    );
    
    if (childNode) {
      children.push(childNode);
    }
    // If childNode is null, edge was cut (cycle or missing data)
  }
  
  // Create hierarchy node
  const hierarchyNode: GenealogyHierarchyNode = {
    personId,
    displayName: nodeData.displayName,
    generation,
    spouses: [...spouses], // Clone array for immutability
    parents: [...parents], // Clone array for immutability
    children,
    data: nodeData,
  };
  
  // Store in nodeMap for O(1) lookup
  context.nodeMap.set(personId, hierarchyNode);
  
  return hierarchyNode;
}

// ============================================================================
// PHASE 4: BUILD GENERATION METADATA
// ============================================================================

/**
 * Builds generation metadata from the constructed hierarchy.
 * 
 * @complexity O(N) where N = number of nodes
 */
function buildGenerationMetadata(
  nodeMap: Map<string, GenealogyHierarchyNode>
): Generation[] {
  const generationMap = new Map<number, string[]>();
  
  // Group nodes by generation level
  for (const node of nodeMap.values()) {
    if (!generationMap.has(node.generation)) {
      generationMap.set(node.generation, []);
    }
    generationMap.get(node.generation)!.push(node.personId);
  }
  
  // Convert to Generation array, sorted by level
  const generations: Generation[] = [];
  const sortedLevels = Array.from(generationMap.keys()).sort((a, b) => a - b);
  
  for (const level of sortedLevels) {
    const personIds = generationMap.get(level)!;
    generations.push({
      level,
      personIds,
      count: personIds.length,
    });
  }
  
  return generations;
}

// ============================================================================
// PHASE 5: CREATE ROOT NODES
// ============================================================================

/**
 * Creates a synthetic root node that contains multiple disconnected roots as children.
 * This simplifies D3.hierarchy() usage by providing a single root.
 * 
 * The synthetic root should be hidden/ignored during rendering.
 */
function createSyntheticRoot(
  rootNodes: GenealogyHierarchyNode[]
): GenealogyHierarchyNode {
  return {
    personId: '__synthetic_root__',
    displayName: '(Multiple Families)',
    generation: -1, // Negative to distinguish from real generations
    spouses: [],
    parents: [],
    children: rootNodes,
    data: {
      id: '__synthetic_root__',
      displayName: '(Multiple Families)',
    },
  };
}

/**
 * Creates an empty root node when no persons exist.
 */
function createEmptyRoot(): GenealogyHierarchyNode {
  return {
    personId: '__empty_root__',
    displayName: '(Empty Tree)',
    generation: 0,
    spouses: [],
    parents: [],
    children: [],
    data: {
      id: '__empty_root__',
      displayName: '(Empty Tree)',
    },
  };
}
