/**
 * HierarchicalTreeCanvas - Hierarchical genealogy tree visualization
 * 
 * Uses d3.hierarchy and d3.tree for deterministic, stable layout.
 * No force simulation - nodes positioned algorithmically.
 * 
 * Features:
 * - Vertical orientation (root at top)
 * - Expand/collapse subtrees (stores hidden children in _children)
 * - Pan and zoom
 * - Selection highlighting with auto-centering
 * - Generation-aligned layout
 * 
 * @module HierarchicalTreeCanvas
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type {
  GenealogyHierarchyResult,
  GenealogyHierarchyNode,
} from '../utils/genealogyHierarchy';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * HierarchicalTreeCanvas component props.
 * Controlled component - parent manages selection and collapse state.
 */
export interface HierarchicalTreeCanvasProps {
  /** Hierarchical genealogy data from buildGenealogyHierarchy() */
  hierarchy: GenealogyHierarchyResult;
  
  /** Tree orientation (vertical only for now) */
  orientation: 'vertical' | 'horizontal';
  
  /** Currently selected person ID (null = no selection) */
  selectedPersonId: string | null;
  
  /** Callback when user clicks a person node */
  onSelectPerson: (personId: string) => void;
  
  /** Layout configuration */
  layout?: {
    nodeSpacingX?: number;
    nodeSpacingY?: number;
    nodeRadius?: number;
    showSpouseEdges?: boolean;
    spouseOffset?: number;
    transitionDuration?: number;
  };
  
  /** Visual theme */
  theme?: {
    nodeFillMale?: string;
    nodeFillFemale?: string;
    nodeFillUnknown?: string;
    selectedColor?: string;
    rootColor?: string;
    edgeColor?: string;
    spouseEdgeColor?: string;
  };
  
  /** Canvas dimensions */
  width?: number;
  height?: number;
}

/**
 * D3 hierarchy node with collapse state.
 * Extends D3's HierarchyPointNode with our data and _children pattern.
 */
interface TreeNode extends d3.HierarchyPointNode<GenealogyHierarchyNode> {
  /** Hidden children (when collapsed) - stores original children array */
  _children?: TreeNode[];
  
  /** Whether this node is currently collapsed */
  _collapsed?: boolean;
  
  /** Unique ID for D3 transitions */
  id: string;
}

/**
 * Spouse node - positioned adjacent to partner node.
 * Not part of hierarchy, positioned manually.
 */
interface SpouseNode {
  /** Person ID of spouse */
  personId: string;
  
  /** Display name */
  displayName: string;
  
  /** Calculated x position (adjacent to partner) */
  x: number;
  
  /** Calculated y position (same as partner) */
  y: number;
  
  /** Reference to partner's tree node */
  partnerId: string;
  
  /** Full node data for rendering */
  data: GenealogyHierarchyNode;
}

/**
 * Spouse link connecting two married persons.
 */
interface SpouseLink {
  /** Source person ID */
  sourceId: string;
  
  /** Target person ID */
  targetId: string;
  
  /** Source x coordinate */
  x1: number;
  
  /** Source y coordinate */
  y1: number;
  
  /** Target x coordinate */
  x2: number;
  
  /** Target y coordinate */
  y2: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_LAYOUT = {
  nodeSpacingX: 150,
  nodeSpacingY: 120,
  nodeRadius: 8,
  showSpouseEdges: true,
  transitionDuration: 300,
  spouseOffset: 60, // Horizontal distance between spouses
};

const DEFAULT_THEME = {
  nodeFillMale: '#3b82f6',
  nodeFillFemale: '#ec4899',
  nodeFillUnknown: '#6b7280',
  selectedColor: '#0ea5e9',
  rootColor: '#10b981',
  edgeColor: '#94a3b8',
  spouseEdgeColor: '#f59e0b', // Distinct color for spouse relationships
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HierarchicalTreeCanvas: React.FC<HierarchicalTreeCanvasProps> = ({
  hierarchy,
  orientation = 'vertical',
  selectedPersonId,
  onSelectPerson,
  layout: layoutConfig,
  theme: themeConfig,
  width: containerWidth,
  height: containerHeight,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  
  // Merge configs with defaults
  const layout = { ...DEFAULT_LAYOUT, ...layoutConfig };
  const theme = { ...DEFAULT_THEME, ...themeConfig };
  
  // Canvas dimensions (use container size if not specified)
  const width = containerWidth || 1200;
  const height = containerHeight || 800;
  
  // D3 refs (persisted across renders)
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const treeLayout = useRef<d3.TreeLayout<GenealogyHierarchyNode>>();
  const rootNode = useRef<TreeNode>();
  const rafIdRef = useRef<number | null>(null);
  
  // ============================================================================
  // INITIALIZE D3 LAYOUT AND ZOOM
  // ============================================================================
  
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    
    // Initialize tree layout
    // d3.tree() calculates x (horizontal) and y (vertical) positions
    // For vertical orientation: x = horizontal position, y = depth (generation)
    const isVertical = orientation === 'vertical';
    // For vertical: breadth=X uses width, depth=Y uses height
    // For horizontal: breadth=X uses height, depth=Y uses width
    const sizePrimary = isVertical ? width - 200 : height - 200;
    const sizeSecondary = isVertical ? height - 200 : width - 200;

    treeLayout.current = d3.tree<GenealogyHierarchyNode>()
      .size([sizePrimary, sizeSecondary]) // Leave margin for nodes at edges
      .separation((a, b) => {
        // Separation function controls horizontal spacing between siblings
        // a.parent === b.parent means they're siblings at same level
        // Return value is multiplied by nodeSpacingX to get actual pixels
        return a.parent === b.parent ? 1 : 1.2;
      });
    
    // Initialize zoom behavior
    zoomBehavior.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3]) // Min and max zoom levels
      .on('zoom', (event) => {
        // Apply zoom transform to the main group
        g.attr('transform', event.transform);
      });
    
    // Apply zoom behavior to SVG
    svg.call(zoomBehavior.current);
    
    // Set initial transform (center the tree)
    const initialTransform = d3.zoomIdentity
      .translate(width / 2, 100); // Start centered-ish
    
    svg.call(zoomBehavior.current.transform, initialTransform);
    
  }, [width, height, orientation]); // Re-initialize if dimensions or orientation change
  
  // ============================================================================
  // BUILD AND RENDER TREE
  // ============================================================================
  
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !treeLayout.current) return;
    
    const g = d3.select(gRef.current);
    const isVertical = orientation === 'vertical';
    
    // Convert GenealogyHierarchyResult to D3 hierarchy
    // d3.hierarchy() requires a node with optional children array
    const root = d3.hierarchy<GenealogyHierarchyNode>(
      hierarchy.root,
      d => d.children // Accessor function: how to get children
    ) as TreeNode;
    
    // Assign unique IDs for D3 transitions (use personId from data)
    root.each((node: TreeNode) => {
      node.id = node.data.personId;
    });
    
    // Apply tree layout algorithm
    // This calculates x and y coordinates for each node
    // x = horizontal position (left to right)
    // y = vertical position (depth, proportional to generation)
    treeLayout.current(root);
    
    // Store root for later use (expand/collapse)
    rootNode.current = root;
    
    // Calculate spouse nodes and links (if enabled)
    const { spouseNodes, spouseLinks } = layout.showSpouseEdges
      ? calculateSpousePositions(root, hierarchy.nodeMap, layout.spouseOffset, isVertical)
      : { spouseNodes: [], spouseLinks: [] };
    
    // Render the tree
    renderTree(g, root, {
      layout,
      theme,
      selectedPersonId,
      onSelectPerson,
      onToggleCollapse: toggleCollapse,
      rootPersonId: hierarchy.isSyntheticRoot ? null : hierarchy.root.personId,
      orientation,
      spouseNodes,
      spouseLinks,
    });
    
  }, [hierarchy, selectedPersonId, layout, theme, orientation]);
  
  // ============================================================================
  // EXPAND/COLLAPSE HANDLING
  // ============================================================================
  
  /**
   * Toggles expand/collapse state of a node.
   * Uses _children pattern: collapsed nodes store children in _children.
   */
  const toggleCollapse = (node: TreeNode) => {
    if (!gRef.current || !treeLayout.current || !rootNode.current) return;
    
    if (node.children) {
      // Currently expanded → collapse
      node._children = node.children;
      node.children = undefined;
      node._collapsed = true;
    } else if (node._children) {
      // Currently collapsed → expand
      node.children = node._children;
      node._children = undefined;
      node._collapsed = false;
    }
    
    // Recalculate layout with new visibility
    treeLayout.current(rootNode.current);
    
    // Recalculate spouse positions
    const isVertical = orientation === 'vertical';
    const { spouseNodes, spouseLinks } = layout.showSpouseEdges
      ? calculateSpousePositions(rootNode.current, hierarchy.nodeMap, layout.spouseOffset, isVertical)
      : { spouseNodes: [], spouseLinks: [] };
    
    // Re-render with transitions
    const g = d3.select(gRef.current);
    renderTree(g, rootNode.current, {
      layout,
      theme,
      selectedPersonId,
      onSelectPerson,
      onToggleCollapse: toggleCollapse,
      rootPersonId: hierarchy.isSyntheticRoot ? null : hierarchy.root.personId,
      orientation,
      spouseNodes,
      spouseLinks,
    });
  };
  
  // ============================================================================
  // CENTER ON SELECTED NODE
  // ============================================================================
  
  useEffect(() => {
    if (!selectedPersonId || !svgRef.current || !rootNode.current || !zoomBehavior.current) return;
    
    // Find the selected node in the tree
    let selectedNode: TreeNode | undefined = undefined;
    rootNode.current.each((node: TreeNode) => {
      if (node.data.personId === selectedPersonId) {
        selectedNode = node;
      }
    });
    
    if (!selectedNode) return;
    
    // Calculate transform to center selected node
    // x and y are from d3.tree() layout
    const svgEl = svgRef.current;
    const current = d3.zoomTransform(svgEl as any);
    const k = current.k; // keep current zoom scale; pan only
    const isVertical = orientation === 'vertical';
    const nodeX = isVertical ? (selectedNode as TreeNode).x : (selectedNode as TreeNode).y;
    const nodeY = isVertical ? (selectedNode as TreeNode).y : (selectedNode as TreeNode).x;
    const targetX = width / 2 - nodeX * k;
    const targetY = height / 2 - nodeY * k;

    // Cancel in-flight animation
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const startX = current.x;
    const startY = current.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const duration = Math.max(150, Math.min(600, layout.transitionDuration));
    const start = performance.now();

    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOut(t);
      const nx = startX + dx * e;
      const ny = startY + dy * e;
      d3.select(svgEl).call(
        zoomBehavior.current!.transform,
        d3.zoomIdentity.translate(nx, ny).scale(k)
      );
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        rafIdRef.current = null;
      }
    };
    rafIdRef.current = requestAnimationFrame(step);
    
  }, [selectedPersonId, width, height, layout.transitionDuration, orientation]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="tree-canvas-container" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ cursor: 'grab', background: '#fafafa' }}
      >
        <g ref={gRef}>
          {/* Tree will be rendered here by D3 */}
        </g>
      </svg>
    </div>
  );
};

// ============================================================================
// SPOUSE POSITION CALCULATION
// ============================================================================

/**
 * Calculates positions for spouse nodes and links.
 * 
 * Strategy:
 * - Position spouse nodes adjacent to their partners (horizontal offset)
 * - Only show spouse if they're NOT already in the tree hierarchy
 * - Create horizontal connector lines between spouses
 * 
 * Trade-offs:
 * - Simple and deterministic
 * - May create wide trees if many spouses
 * - Spouses are "attached" to first occurrence in tree
 * - If spouse appears in tree, show reference link instead of duplicate node
 */
function calculateSpousePositions(
  root: TreeNode,
  nodeMap: Map<string, GenealogyHierarchyNode>,
  spouseOffset: number,
  isVertical: boolean
): { spouseNodes: SpouseNode[]; spouseLinks: SpouseLink[] } {
  const spouseNodes: SpouseNode[] = [];
  const spouseLinks: SpouseLink[] = [];
  const processedSpouses = new Set<string>(); // Track to avoid duplicates
  
  // Traverse all visible nodes
  root.each((node: TreeNode) => {
    const spouses = node.data.spouses || [];
    
    for (const spouseId of spouses) {
      // Generate unique link ID for this spouse pair
      const linkId = [node.data.personId, spouseId].sort().join('-');
      
      // Skip if already processed (avoid duplicate links)
      if (processedSpouses.has(linkId)) continue;
      processedSpouses.add(linkId);
      
      // Check if spouse exists in the tree hierarchy
      let spouseTreeNode: TreeNode | null = null;
      root.each((n: TreeNode) => {
        if (n.data.personId === spouseId) {
          spouseTreeNode = n;
        }
      });
      
      if (spouseTreeNode) {
        // Spouse is in tree - create reference link between tree positions
        spouseLinks.push({
          sourceId: node.data.personId,
          targetId: spouseId,
          x1: node.x,
          y1: node.y,
          x2: spouseTreeNode.x,
          y2: spouseTreeNode.y,
        });
      } else {
        // Spouse not in tree - create adjacent spouse node
        const spouseData = nodeMap.get(spouseId);
        if (spouseData) {
          // Position spouse adjacent on the cross-axis
          const sx = isVertical ? node.x + spouseOffset : node.x;
          const sy = isVertical ? node.y : node.y + spouseOffset;
          const spouseNode: SpouseNode = {
            personId: spouseId,
            displayName: spouseData.displayName,
            x: sx,
            y: sy,
            partnerId: node.data.personId,
            data: spouseData,
          };
          
          spouseNodes.push(spouseNode);
          
          // Create horizontal link
          spouseLinks.push({
            sourceId: node.data.personId,
            targetId: spouseId,
            x1: node.x,
            y1: node.y,
            x2: spouseNode.x,
            y2: spouseNode.y,
          });
        }
      }
    }
  });
  
  return { spouseNodes, spouseLinks };
}

// ============================================================================
// RENDER TREE FUNCTION (D3 + React hybrid)
// ============================================================================

interface RenderOptions {
  layout: typeof DEFAULT_LAYOUT;
  theme: typeof DEFAULT_THEME;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  onToggleCollapse: (node: TreeNode) => void;
  rootPersonId: string | null;
  orientation: 'vertical' | 'horizontal';
  spouseNodes: SpouseNode[];
  spouseLinks: SpouseLink[];
}

/**
 * Renders the tree using D3 selections.
 * This is called on every update (hierarchy change, selection change, etc.)
 * 
 * Uses D3's enter/update/exit pattern for efficient DOM manipulation.
 */
function renderTree(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  root: TreeNode,
  options: RenderOptions
) {
  const { layout, theme, selectedPersonId, onSelectPerson, onToggleCollapse, rootPersonId, spouseNodes, spouseLinks, orientation } = options;
  const duration = layout.transitionDuration;
  const isVertical = orientation === 'vertical';
  const PX = (x: number, y: number) => (isVertical ? x : y);
  const PY = (x: number, y: number) => (isVertical ? y : x);
  
  // Get all visible nodes and links
  const nodes = root.descendants() as TreeNode[];
  const links = root.links();
  
  // ============================================================================
  // RENDER LINKS (Parent → Child edges)
  // ============================================================================
  
  // Select or create links group
  let linksGroup = g.select<SVGGElement>('g.links');
  if (linksGroup.empty()) {
    linksGroup = g.append('g').attr('class', 'links');
  }
  
  // Bind data to links (using source+target IDs as key)
  const linkSelection = linksGroup
    .selectAll<SVGPathElement, d3.HierarchyPointLink<GenealogyHierarchyNode>>('path.link')
    .data(links, d => `${(d.source as TreeNode).id}-${(d.target as TreeNode).id}`);
  
  // ENTER: Create new links
  const linkEnter = linkSelection
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('fill', 'none')
    .attr('stroke', theme.edgeColor)
    .attr('stroke-width', 2)
    .attr('d', (d: d3.HierarchyPointLink<GenealogyHierarchyNode>) => {
      // Start from parent position (for smooth enter transition)
      const source = d.source as TreeNode;
      const sx = PX(source.x, source.y);
      const sy = PY(source.x, source.y);
      return diagonalPath(sx, sy, sx, sy, isVertical);
    });
  
  // UPDATE: Update existing links
  const linkUpdate = linkEnter.merge(linkSelection);
  
  linkUpdate
    .transition()
    .duration(duration)
    .attr('d', d => {
      // Draw curved path from parent to child
      const source = d.source as TreeNode;
      const target = d.target as TreeNode;
      const sx = PX(source.x, source.y);
      const sy = PY(source.x, source.y);
      const tx = PX(target.x, target.y);
      const ty = PY(target.x, target.y);
      return diagonalPath(sx, sy, tx, ty, isVertical);
    })
    .attr('stroke', d => {
      // Highlight links connected to selected node
      const source = d.source as TreeNode;
      const target = d.target as TreeNode;
      if (
        selectedPersonId &&
        (source.data.personId === selectedPersonId || target.data.personId === selectedPersonId)
      ) {
        return theme.selectedColor;
      }
      return theme.edgeColor;
    })
    .attr('stroke-width', d => {
      // Thicker stroke for selected links
      const source = d.source as TreeNode;
      const target = d.target as TreeNode;
      if (
        selectedPersonId &&
        (source.data.personId === selectedPersonId || target.data.personId === selectedPersonId)
      ) {
        return 3;
      }
      return 2;
    });
  
  // EXIT: Remove old links
  linkSelection
    .exit()
    .transition()
    .duration(duration)
    .attr('d', d => {
      // Collapse to parent position
      const source = d.source as TreeNode;
      const sx = PX(source.x, source.y);
      const sy = PY(source.x, source.y);
      return diagonalPath(sx, sy, sx, sy, isVertical);
    })
    .remove();
  
  // ============================================================================
  // RENDER NODES
  // ============================================================================
  
  // Select or create nodes group
  let nodesGroup = g.select<SVGGElement>('g.nodes');
  if (nodesGroup.empty()) {
    nodesGroup = g.append('g').attr('class', 'nodes');
  }
  
  // Bind data to nodes (using personId as key)
  const nodeSelection = nodesGroup
    .selectAll<SVGGElement, TreeNode>('g.node')
    .data(nodes, d => d.id);
  
  // ENTER: Create new nodes
  const nodeEnter = nodeSelection
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${PX(d.x, d.y)},${PY(d.x, d.y)})`)
    .style('opacity', 0)
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      // Click node circle → select person
      if (event.target.tagName === 'circle' || event.target.tagName === 'text') {
        onSelectPerson(d.data.personId);
      }
    });
  
  // Add circle for each node
  nodeEnter
    .append('circle')
    .attr('r', layout.nodeRadius)
    .attr('fill', d => getNodeColor(d.data, theme))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);
  
  // Add text label below node
  nodeEnter
    .append('text')
    .attr('dy', layout.nodeRadius + 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .attr('fill', '#374151')
    .text(d => truncateText(d.data.displayName, 15));
  
  // Add expand/collapse button for nodes with children
  const expandButton = nodeEnter
    .filter((d: TreeNode) => d.data.children.length > 0 || !!d._children)
    .append('g')
    .attr('class', 'expand-button')
    .style('cursor', 'pointer')
    .on('click', (event, d) => {
      event.stopPropagation();
      onToggleCollapse(d);
    });

  // Tooltip affordance
  expandButton
    .append('title')
    .text(d => (d.children ? 'Collapse' : 'Expand'));
  
  // Button background circle
  expandButton
    .append('circle')
    .attr('r', 10)
    .attr('cy', layout.nodeRadius + 35)
    .attr('fill', '#fff')
    .attr('stroke', theme.edgeColor)
    .attr('stroke-width', 2);
  
  // Button icon (+ or −)
  expandButton
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', layout.nodeRadius + 40)
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .attr('fill', theme.edgeColor)
    .text(d => (d.children ? '−' : '+'));
  
  // UPDATE: Update existing nodes
  const nodeUpdate = nodeEnter.merge(nodeSelection);
  
  nodeUpdate
    .transition()
    .duration(duration)
    .attr('transform', d => `translate(${PX(d.x, d.y)},${PY(d.x, d.y)})`)
    .style('opacity', 1);
  
  // Update circle (highlight selected node)
  nodeUpdate
    .select('circle')
    .transition()
    .duration(duration)
    .attr('r', d => (d.data.personId === selectedPersonId ? layout.nodeRadius + 3 : layout.nodeRadius))
    .attr('fill', d => (d.data.personId === selectedPersonId ? theme.selectedColor : getNodeColor(d.data, theme)))
    .attr('stroke', d => (rootPersonId && d.data.personId === rootPersonId ? theme.rootColor : '#fff'))
    .attr('stroke-width', d => (d.data.personId === selectedPersonId ? 3 : 2));
  
  // Update expand/collapse button icon
  nodeUpdate
    .select('.expand-button text')
    .text(d => (d.children ? '−' : '+'));
  
  // EXIT: Remove old nodes
  nodeSelection
    .exit()
    .transition()
    .duration(duration)
    .style('opacity', 0)
    .remove();
  
  // ============================================================================
  // RENDER SPOUSE LINKS (Horizontal connectors)
  // ============================================================================
  
  if (layout.showSpouseEdges) {
    // Select or create spouse links group
    let spouseLinksGroup = g.select<SVGGElement>('g.spouse-links');
    if (spouseLinksGroup.empty()) {
      spouseLinksGroup = g.append('g').attr('class', 'spouse-links');
    }
    
    // Bind data to spouse links
    const spouseLinkSelection = spouseLinksGroup
      .selectAll<SVGLineElement, SpouseLink>('line.spouse-link')
      .data(spouseLinks, d => `${d.sourceId}-${d.targetId}`);
    
    // ENTER: Create new spouse links
    const spouseLinkEnter = spouseLinkSelection
      .enter()
      .append('line')
      .attr('class', 'spouse-link')
      .attr('stroke', theme.spouseEdgeColor)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5') // Dashed line to distinguish from parent-child
      .attr('x1', d => PX(d.x1, d.y1))
      .attr('y1', d => PY(d.x1, d.y1))
      .attr('x2', d => PX(d.x1, d.y1)) // Start collapsed at source
      .attr('y2', d => PY(d.x1, d.y1))
      .style('opacity', 0);
    
    // UPDATE: Update existing spouse links
    const spouseLinkUpdate = spouseLinkEnter.merge(spouseLinkSelection);
    
    spouseLinkUpdate
      .transition()
      .duration(duration)
      .attr('x1', d => PX(d.x1, d.y1))
      .attr('y1', d => PY(d.x1, d.y1))
      .attr('x2', d => PX(d.x2, d.y2))
      .attr('y2', d => PY(d.x2, d.y2))
      .style('opacity', 0.7);
    
    // EXIT: Remove old spouse links
    spouseLinkSelection
      .exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();
  }
  
  // ============================================================================
  // RENDER SPOUSE NODES (Adjacent to partners)
  // ============================================================================
  
  if (layout.showSpouseEdges) {
    // Select or create spouse nodes group
    let spouseNodesGroup = g.select<SVGGElement>('g.spouse-nodes');
    if (spouseNodesGroup.empty()) {
      spouseNodesGroup = g.append('g').attr('class', 'spouse-nodes');
    }
    
    // Bind data to spouse nodes
    const spouseNodeSelection = spouseNodesGroup
      .selectAll<SVGGElement, SpouseNode>('g.spouse-node')
      .data(spouseNodes, d => d.personId);
    
    // ENTER: Create new spouse nodes
    const spouseNodeEnter = spouseNodeSelection
      .enter()
      .append('g')
      .attr('class', 'spouse-node')
      .attr('transform', d => `translate(${PX(d.x, d.y)},${PY(d.x, d.y)})`)
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectPerson(d.personId);
      });
    
    // Add circle for spouse node
    spouseNodeEnter
      .append('circle')
      .attr('r', layout.nodeRadius)
      .attr('fill', d => getNodeColor(d.data, theme))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Add text label
    spouseNodeEnter
      .append('text')
      .attr('dy', layout.nodeRadius + 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .text(d => truncateText(d.displayName, 15));
    
    // Add spouse indicator badge (small heart icon)
    spouseNodeEnter
      .append('text')
      .attr('dy', -layout.nodeRadius - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', theme.spouseEdgeColor)
      .text('♥'); // Heart symbol to indicate spouse
    
    // UPDATE: Update existing spouse nodes
    const spouseNodeUpdate = spouseNodeEnter.merge(spouseNodeSelection);
    
    spouseNodeUpdate
      .transition()
      .duration(duration)
      .attr('transform', d => `translate(${PX(d.x, d.y)},${PY(d.x, d.y)})`)
      .style('opacity', 1);
    
    // Update circle (highlight if selected)
    spouseNodeUpdate
      .select('circle')
      .transition()
      .duration(duration)
      .attr('r', d => (d.personId === selectedPersonId ? layout.nodeRadius + 3 : layout.nodeRadius))
      .attr('fill', d => (d.personId === selectedPersonId ? theme.selectedColor : getNodeColor(d.data, theme)))
      .attr('stroke-width', d => (d.personId === selectedPersonId ? 3 : 2));
    
    // EXIT: Remove old spouse nodes
    spouseNodeSelection
      .exit()
      .transition()
      .duration(duration)
      .style('opacity', 0)
      .remove();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a curved path between two points (Bezier curve).
 * For vertical trees: path curves from parent (x1, y1) to child (x2, y2).
 * 
 * Math explanation:
 * - Start at (x1, y1) - parent node
 * - Control point 1: (x1, (y1 + y2) / 2) - halfway down from parent
 * - Control point 2: (x2, (y1 + y2) / 2) - halfway down to child
 * - End at (x2, y2) - child node
 * 
 * This creates an S-curve that clearly shows parent → child direction.
 */
function diagonalPath(x1: number, y1: number, x2: number, y2: number, isVertical: boolean): string {
  if (isVertical) {
    const midY = (y1 + y2) / 2;
    return `M ${x1},${y1}
            C ${x1},${midY}
              ${x2},${midY}
              ${x2},${y2}`;
  } else {
    const midX = (x1 + x2) / 2;
    return `M ${x1},${y1}
            C ${midX},${y1}
              ${midX},${y2}
              ${x2},${y2}`;
  }
}

/**
 * Gets node fill color based on gender.
 */
function getNodeColor(node: GenealogyHierarchyNode, theme: typeof DEFAULT_THEME): string {
  // Check if node has gender info in data
  const gender = (node.data as any).gender;
  
  if (gender === 'MALE') return theme.nodeFillMale;
  if (gender === 'FEMALE') return theme.nodeFillFemale;
  return theme.nodeFillUnknown;
}

/**
 * Truncates text to max length with ellipsis.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 1) + '…';
}
