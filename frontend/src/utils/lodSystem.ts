/**
 * Level of Detail (LOD) rendering system
 * Adjusts rendering complexity based on zoom level
 */

export interface LODLevel {
  name: string;
  zoomThreshold: number;
  nodeSize: number;
  labelVisible: boolean;
  labelFontSize: number;
  edgeVisible: boolean;
  edgeWidth: number;
  showDetails: boolean;
  showImages: boolean;
  showRelationshipLabels: boolean;
  nodeColorDetail: 'full' | 'gender' | 'generation' | 'mono';
}

/**
 * Default LOD levels - more granular than simple high/medium/low
 */
export const LOD_LEVELS: Record<string, LODLevel> = {
  // Ultra far - entire tree visible at once
  VeryFar: {
    name: 'Very Far',
    zoomThreshold: 0.1,
    nodeSize: 2,
    labelVisible: false,
    labelFontSize: 0,
    edgeVisible: true,
    edgeWidth: 0.5,
    showDetails: false,
    showImages: false,
    showRelationshipLabels: false,
    nodeColorDetail: 'mono',
  },

  // Far - clusters of people visible
  Far: {
    name: 'Far',
    zoomThreshold: 0.25,
    nodeSize: 4,
    labelVisible: false,
    labelFontSize: 8,
    edgeVisible: true,
    edgeWidth: 1,
    showDetails: false,
    showImages: false,
    showRelationshipLabels: false,
    nodeColorDetail: 'gender',
  },

  // Medium far - individuals visible but minimal detail
  MediumFar: {
    name: 'Medium Far',
    zoomThreshold: 0.5,
    nodeSize: 6,
    labelVisible: true,
    labelFontSize: 10,
    edgeVisible: true,
    edgeWidth: 1.2,
    showDetails: false,
    showImages: false,
    showRelationshipLabels: false,
    nodeColorDetail: 'generation',
  },

  // Medium - balanced view
  Medium: {
    name: 'Medium',
    zoomThreshold: 1.0,
    nodeSize: 12,
    labelVisible: true,
    labelFontSize: 12,
    edgeVisible: true,
    edgeWidth: 1.5,
    showDetails: true,
    showImages: false,
    showRelationshipLabels: false,
    nodeColorDetail: 'full',
  },

  // Close - detailed view
  Close: {
    name: 'Close',
    zoomThreshold: 1.5,
    nodeSize: 18,
    labelVisible: true,
    labelFontSize: 14,
    edgeVisible: true,
    edgeWidth: 2,
    showDetails: true,
    showImages: true,
    showRelationshipLabels: true,
    nodeColorDetail: 'full',
  },

  // Very close - maximum detail
  VeryClose: {
    name: 'Very Close',
    zoomThreshold: 2.5,
    nodeSize: 24,
    labelVisible: true,
    labelFontSize: 16,
    edgeVisible: true,
    edgeWidth: 2.5,
    showDetails: true,
    showImages: true,
    showRelationshipLabels: true,
    nodeColorDetail: 'full',
  },
};

/**
 * Get LOD level for current zoom
 */
export function getLODLevel(zoomLevel: number): LODLevel {
  const levels = Object.values(LOD_LEVELS);

  // Find the appropriate LOD level
  for (let i = levels.length - 1; i >= 0; i--) {
    if (zoomLevel >= levels[i].zoomThreshold) {
      return levels[i];
    }
  }

  return LOD_LEVELS.VeryFar;
}

/**
 * Determine if a node should be rendered at current LOD
 */
export function shouldRenderNode(
  zoomLevel: number,
  nodeImportance: number = 0.5 // 0 = not important, 1 = critical
): boolean {
  const lod = getLODLevel(zoomLevel);

  // At very far levels, only render important nodes
  if (lod.name === 'VeryFar') {
    return nodeImportance > 0.8;
  }
  if (lod.name === 'Far') {
    return nodeImportance > 0.6;
  }

  return true; // Render all at closer levels
}

/**
 * Calculate node importance score
 */
export function calculateNodeImportance(
  nodeId: string,
  isDirect: boolean,
  generationDistance: number,
  hasChildren: boolean
): number {
  let importance = 0.5;

  // Direct line ancestors/descendants are important
  if (isDirect) importance += 0.3;

  // Closer generations matter more
  importance -= Math.min(generationDistance / 10, 0.2);

  // Nodes with children are important
  if (hasChildren) importance += 0.1;

  return Math.max(0, Math.min(1, importance));
}

/**
 * Simplify node data for far views
 */
export function simplifyNodeData(
  node: any,
  lod: LODLevel
): Partial<typeof node> {
  if (!lod.showDetails) {
    return {
      id: node.id,
      displayName: node.displayName,
      // Don't include other details
    };
  }

  if (!lod.showImages) {
    const { imageUrl, ...rest } = node;
    return rest;
  }

  return node;
}

/**
 * Filter edges based on LOD
 */
export function filterEdgesForLOD(
  edges: any[],
  zoomLevel: number,
  visibleNodeIds: Set<string>
): any[] {
  const lod = getLODLevel(zoomLevel);

  return edges.filter((edge) => {
    // Only show edges between visible nodes
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) {
      return false;
    }

    // At very far, hide non-critical edges
    if (lod.name === 'VeryFar' && edge.type === 'spouse') {
      return false; // Hide spouse relationships at very far
    }

    return true;
  });
}

/**
 * Calculate appropriate label for LOD
 */
export function getNodeLabel(node: any, lod: LODLevel): string {
  if (!lod.labelVisible) {
    return '';
  }

  if (lod.nodeSize < 8) {
    // Very small nodes - use initials only
    const parts = node.displayName.split(' ');
    return parts.map((p: string) => p[0]).join('').toUpperCase();
  }

  if (lod.nodeSize < 12) {
    // Small nodes - use first name only
    return node.displayName.split(' ')[0];
  }

  // Larger nodes - use full name
  return node.displayName;
}

/**
 * LOD statistics for diagnostics
 */
export interface LODStats {
  totalNodes: number;
  renderedNodes: number;
  totalEdges: number;
  renderedEdges: number;
  currentLOD: string;
  zoomLevel: number;
  estimatedNodeSize: number;
  estimatedLabelSize: number;
}

/**
 * Calculate LOD statistics
 */
export function calculateLODStats(
  allNodes: any[],
  visibleNodes: any[],
  allEdges: any[],
  visibleEdges: any[],
  zoomLevel: number
): LODStats {
  const lod = getLODLevel(zoomLevel);

  return {
    totalNodes: allNodes.length,
    renderedNodes: visibleNodes.length,
    totalEdges: allEdges.length,
    renderedEdges: visibleEdges.length,
    currentLOD: lod.name,
    zoomLevel,
    estimatedNodeSize: lod.nodeSize,
    estimatedLabelSize: lod.labelFontSize,
  };
}

/**
 * Context-aware LOD for specific node types
 */
export function getNodeLODContext(
  node: any,
  selectedNodeId: string | null
): { isSelected: boolean; isRelated: boolean; importance: number } {
  const isSelected = node.id === selectedNodeId;
  const isRelated = false; // Would be true if connected to selected

  return {
    isSelected,
    isRelated,
    importance: isSelected ? 1 : isRelated ? 0.7 : 0.5,
  };
}
