/**
 * Convert a genealogy graph into a nested hierarchy suitable for d3.hierarchy.
 * Supports building ancestors and/or descendants from a root person and handles
 * multiple-parent scenarios by duplicating nodes across branches when necessary.
 */

export type GraphNode = {
  id: string;
  name?: string;
  displayName?: string;
  generation?: number;
};

export type GraphLink = {
  source: string;
  target: string;
  relation: 'parent-child' | 'spouse' | string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type HierarchyNodeData = {
  id: string;
  label?: string;
  name?: string;
  type: 'person' | 'branch';
  branchKind?: 'ancestors' | 'descendants';
  children: HierarchyNodeData[];
};

export type ConvertOptions = {
  includeAncestors?: boolean; // default true
  includeDescendants?: boolean; // default true
  maxDepthAncestors?: number; // optional
  maxDepthDescendants?: number; // optional
};

/**
 * Build adjacency maps for quick traversal
 */
function buildAdjacency(graph: GraphData) {
  const parentsOf = new Map<string, Set<string>>();
  const childrenOf = new Map<string, Set<string>>();
  const spousesOf = new Map<string, Set<string>>();

  for (const link of graph.links) {
    if (link.relation === 'parent-child') {
      // parent -> child
      const parent = link.source;
      const child = link.target;
      if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
      if (!parentsOf.has(child)) parentsOf.set(child, new Set());
      childrenOf.get(parent)!.add(child);
      parentsOf.get(child)!.add(parent);
    } else if (link.relation === 'spouse') {
      const a = link.source;
      const b = link.target;
      if (!spousesOf.has(a)) spousesOf.set(a, new Set());
      if (!spousesOf.has(b)) spousesOf.set(b, new Set());
      spousesOf.get(a)!.add(b);
      spousesOf.get(b)!.add(a);
    }
  }

  return { parentsOf, childrenOf, spousesOf };
}

function getName(graph: GraphData, id: string): string {
  const n = graph.nodes.find((x) => x.id === id);
  return n?.displayName || n?.name || id;
}

/**
 * Recursively build an ancestors hierarchy.
 * Duplicates nodes across branches when they appear via different paths.
 */
function buildAncestors(
  graph: GraphData,
  id: string,
  parentsOf: Map<string, Set<string>>,
  depth: number,
  maxDepth?: number,
  pathVisited?: Set<string>,
): HierarchyNodeData {
  const visited = pathVisited ?? new Set<string>();
  const node: HierarchyNodeData = {
    id,
    name: getName(graph, id),
    type: 'person',
    children: [],
  };

  if (maxDepth !== undefined && depth >= maxDepth) return node;

  // Prevent infinite loops within the current path (cycles should not exist but be defensive)
  if (visited.has(id)) return node;
  visited.add(id);

  const parents = Array.from(parentsOf.get(id) ?? []);
  node.children = parents.map((pid) =>
    buildAncestors(graph, pid, parentsOf, depth + 1, maxDepth, new Set(visited))
  );

  return node;
}

/**
 * Recursively build a descendants hierarchy.
 */
function buildDescendants(
  graph: GraphData,
  id: string,
  childrenOf: Map<string, Set<string>>,
  depth: number,
  maxDepth?: number,
  pathVisited?: Set<string>,
): HierarchyNodeData {
  const visited = pathVisited ?? new Set<string>();
  const node: HierarchyNodeData = {
    id,
    name: getName(graph, id),
    type: 'person',
    children: [],
  };

  if (maxDepth !== undefined && depth >= maxDepth) return node;

  if (visited.has(id)) return node;
  visited.add(id);

  const children = Array.from(childrenOf.get(id) ?? []);
  node.children = children.map((cid) =>
    buildDescendants(graph, cid, childrenOf, depth + 1, maxDepth, new Set(visited))
  );

  return node;
}

/**
 * Convert a graph to a combined hierarchy with the root person and two branch nodes
 * (Ancestors and Descendants) as children when both directions are requested.
 */
export function convertGraphToHierarchy(
  graph: GraphData,
  rootId: string,
  options: ConvertOptions = {},
): HierarchyNodeData {
  const {
    includeAncestors = true,
    includeDescendants = true,
    maxDepthAncestors,
    maxDepthDescendants,
  } = options;

  const { parentsOf, childrenOf } = buildAdjacency(graph);

  // Base root person
  const root: HierarchyNodeData = {
    id: rootId,
    name: getName(graph, rootId),
    type: 'person',
    children: [],
  };

  const branches: HierarchyNodeData[] = [];

  if (includeAncestors) {
    const anc = buildAncestors(graph, rootId, parentsOf, 0, maxDepthAncestors);
    // Attach ancestors under a labeled branch to avoid mixing directions visually
    branches.push({
      id: `${rootId}::ancestors`,
      label: 'Ancestors',
      type: 'branch',
      branchKind: 'ancestors',
      children: anc.children, // only parents as children; do not duplicate the root
    });
  }

  if (includeDescendants) {
    const des = buildDescendants(graph, rootId, childrenOf, 0, maxDepthDescendants);
    branches.push({
      id: `${rootId}::descendants`,
      label: 'Descendants',
      type: 'branch',
      branchKind: 'descendants',
      children: des.children, // only children below the root
    });
  }

  root.children = branches;
  return root;
}
