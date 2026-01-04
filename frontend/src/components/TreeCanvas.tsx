import React, { useEffect, useRef, useState, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { TreeViewModel, ViewEdge } from '../adapters/renderDataAdapter';
import { debounce, throttle, measurePerformance } from '../utils/performance';
import { debounce as debounceUtil, rafDebounce } from '../utils/debounce';
import { getPerformanceMonitor } from '../utils/performanceMetrics';
import { getLODLevel, shouldRenderNode, filterEdgesForLOD, getNodeLabel, calculateLODStats } from '../utils/lodSystem';
import { getGlobalLayoutCache, generateCacheKey } from '../utils/layoutCache';
import { getGlobalMonitor } from '../utils/performanceMonitor';
import { VirtualRenderer, RenderQueue, IntersectionDetector } from '../utils/virtualRendering';

export type TreeCanvasRef = {
  exportSVG: (filename: string, includeMetadata?: boolean) => void;
  exportPNG: (filename: string, includeMetadata?: boolean) => Promise<void>;
  exportPDF: (filename: string, includeMetadata?: boolean) => Promise<void>;
};

type TreeCanvasProps = {
  data: TreeViewModel;
  selectedPersonId: string | null;
  relatedEdgeIds: Set<string>;
  onNodeClick: (personId: string) => void;
  onEdgeClick?: (edge: ViewEdge) => void;
  directRelativeIds?: Set<string>;
  layoutOrientation?: 'vertical' | 'horizontal';
  onExpandCollapseAll?: (handler: (action: 'expand' | 'collapse') => void) => void;
  treeName?: string;
  onEdit?: (personId: string) => void;
  onAddRelative?: () => void;
  onToggleCollapse?: (personId: string) => void;
};

const ACCENT_COLOR = '#0d6efd'; // Bootstrap Primary

type NodeDatum = d3.SimulationNodeDatum & {
  id: string;
  displayName: string;
};

type EdgeDatum = d3.SimulationLinkDatum<NodeDatum> & RenderEdgeData;

export const TreeCanvas = forwardRef<TreeCanvasRef, TreeCanvasProps>(({
  data,
  selectedPersonId,
  relatedEdgeIds,
  onNodeClick,
  onEdgeClick,
  directRelativeIds,
  layoutOrientation = 'vertical',
  onExpandCollapseAll,
  treeName,
  onEdit,
  onAddRelative,
  onToggleCollapse,
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('silsilah:collapsedNodes');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  
  // Performance optimization state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showPerformanceStats, setShowPerformanceStats] = useState(false);
  const performanceMonitor = getGlobalMonitor();
  const layoutCache = getGlobalLayoutCache();
  const virtualRendererRef = useRef<VirtualRenderer>(new VirtualRenderer());
  const intersectionDetectorRef = useRef<IntersectionDetector>(new IntersectionDetector());

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('silsilah:collapsedNodes', JSON.stringify([...collapsedNodes]));
  }, [collapsedNodes]);

  // Build parent-children map and identify parent nodes
  const { parentChildMap, parentNodes, descendantCounts } = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const parents = new Set<string>();
    
    data.edges.forEach(edge => {
      if (edge.type === 'parent-child') {
        const parentId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        const childId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
        
        if (!map.has(parentId)) map.set(parentId, new Set());
        map.get(parentId)!.add(childId);
        parents.add(parentId);
      }
    });

    // Calculate descendant counts for each node
    const counts = new Map<string, number>();
    const getDescendantCount = (nodeId: string, visited = new Set<string>()): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);
      
      const children = map.get(nodeId);
      if (!children || children.size === 0) return 0;
      
      let count = children.size;
      children.forEach(childId => {
        count += getDescendantCount(childId, visited);
      });
      return count;
    };
    
    parents.forEach(parentId => {
      counts.set(parentId, getDescendantCount(parentId));
    });

    return { parentChildMap: map, parentNodes: parents, descendantCounts: counts };
  }, [data.edges]);

  // Get all descendants of a node
  const getAllDescendants = useCallback((nodeId: string): Set<string> => {
    const descendants = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = parentChildMap.get(current);
      if (children) {
        children.forEach(childId => {
          descendants.add(childId);
          queue.push(childId);
        });
      }
    }
    
    return descendants;
  }, [parentChildMap]);

  // Filter nodes and edges based on collapsed state
  const { filteredNodes, filteredEdges } = useMemo(() => {
    const hiddenNodes = new Set<string>();
    
    // Collect all descendants of collapsed nodes
    collapsedNodes.forEach(nodeId => {
      getAllDescendants(nodeId).forEach(desc => hiddenNodes.add(desc));
    });
    
    const visibleNodes = data.nodes.filter(node => !hiddenNodes.has(node.id));
    const visibleEdges = data.edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
      const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
      return !hiddenNodes.has(sourceId) && !hiddenNodes.has(targetId);
    });
    
    return { filteredNodes: visibleNodes, filteredEdges: visibleEdges };
  }, [data.nodes, data.edges, collapsedNodes, getAllDescendants]);

  // Toggle collapse state
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Expand/Collapse all nodes
  const handleExpandCollapseAll = useCallback((action: 'expand' | 'collapse') => {
    if (action === 'expand') {
      setCollapsedNodes(new Set());
    } else {
      setCollapsedNodes(new Set(parentNodes));
    }
  }, [parentNodes]);

  // Expand to specific level
  const expandToLevel = useCallback((targetLevel: number) => {
    // Build level map using BFS from root nodes
    const levels = new Map<string, number>();
    const roots = data.nodes.filter(node => {
      return !data.edges.some(edge => 
        edge.type === 'parent-child' && 
        (typeof edge.target === 'string' ? edge.target : (edge.target as any).id) === node.id
      );
    });

    const queue: Array<{ id: string; level: number }> = roots.map(r => ({ id: r.id, level: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);

      const children = parentChildMap.get(id);
      if (children) {
        children.forEach(childId => {
          queue.push({ id: childId, level: level + 1 });
        });
      }
    }

    // Collapse nodes at levels > targetLevel
    const toCollapse = new Set<string>();
    parentNodes.forEach(nodeId => {
      const level = levels.get(nodeId) ?? 0;
      if (level >= targetLevel) {
        toCollapse.add(nodeId);
      }
    });
    setCollapsedNodes(toCollapse);
  }, [data.nodes, data.edges, parentChildMap, parentNodes]);

  // Find adjacent nodes for keyboard navigation
  const getAdjacentNodeIds = useCallback((): { up?: string; down?: string; left?: string; right?: string } => {
    if (!selectedPersonId) return {};
    
    const siblings = new Set<string>();
    const parents = new Set<string>();
    const children = new Set<string>();
    
    // Find parent nodes
    data.edges.forEach(edge => {
      if (edge.type === 'parent-child') {
        const childId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
        if (childId === selectedPersonId) {
          const parentId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
          parents.add(parentId);
        }
        
        // Find siblings (other children of same parent)
        const parentId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        if (parentId === selectedPersonId) {
          children.add(childId);
        } else if (parents.has(parentId)) {
          siblings.add(childId);
        }
      }
    });
    
    // Get child nodes
    const nodeChildren = parentChildMap.get(selectedPersonId) || new Set();
    nodeChildren.forEach(id => children.add(id));
    
    const result: { up?: string; down?: string; left?: string; right?: string } = {};
    
    // For vertical layout: up = parent, down = child, left/right = siblings
    if (layoutOrientation === 'vertical') {
      if (parents.size > 0) result.up = Array.from(parents)[0];
      if (children.size > 0) result.down = Array.from(children)[0];
      const sibArray = Array.from(siblings);
      if (sibArray.length > 0) {
        result.left = sibArray[0];
        result.right = sibArray[1] || sibArray[0];
      }
    } else {
      // For horizontal layout: left = parent, right = child, up/down = siblings
      if (parents.size > 0) result.left = Array.from(parents)[0];
      if (children.size > 0) result.right = Array.from(children)[0];
      const sibArray = Array.from(siblings);
      if (sibArray.length > 0) {
        result.up = sibArray[0];
        result.down = sibArray[1] || sibArray[0];
      }
    }
    
    return result;
  }, [selectedPersonId, data.edges, parentChildMap, layoutOrientation]);

  // Keyboard event handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();
    
    // Arrow keys for navigation
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      const adjacentNodes = getAdjacentNodeIds();
      const keyMap: { [key: string]: keyof typeof adjacentNodes } = {
        'arrowup': 'up',
        'arrowdown': 'down',
        'arrowleft': 'left',
        'arrowright': 'right',
      };
      const nextNodeId = adjacentNodes[keyMap[key]];
      if (nextNodeId) {
        onNodeClick(nextNodeId);
      }
      return;
    }

    // Enter or Space to select/confirm
    if (key === 'enter' || key === ' ') {
      e.preventDefault();
      // Selection already made, could be used for confirming
      return;
    }

    // +/- for expand/collapse
    if (key === '+' || key === '=') {
      e.preventDefault();
      if (selectedPersonId && parentNodes.has(selectedPersonId)) {
        toggleCollapse(selectedPersonId);
        if (onToggleCollapse) onToggleCollapse(selectedPersonId);
      }
      return;
    }

    if (key === '-' || key === '_') {
      e.preventDefault();
      if (selectedPersonId && !parentNodes.has(selectedPersonId)) {
        // If not a parent, collapse it anyway
        setCollapsedNodes(prev => new Set([...prev, selectedPersonId]));
      } else if (selectedPersonId && parentNodes.has(selectedPersonId) && !collapsedNodes.has(selectedPersonId)) {
        toggleCollapse(selectedPersonId);
        if (onToggleCollapse) onToggleCollapse(selectedPersonId);
      }
      return;
    }

    // E to edit
    if (key === 'e' && selectedPersonId) {
      e.preventDefault();
      if (onEdit) onEdit(selectedPersonId);
      return;
    }

    // A to add relative
    if (key === 'a' && selectedPersonId) {
      e.preventDefault();
      if (onAddRelative) onAddRelative();
      return;
    }

    // Escape to deselect
    if (key === 'escape') {
      e.preventDefault();
      onNodeClick(null as any);
      return;
    }

    // ? or / for help (show keyboard shortcuts)
    if (key === '?' || key === '/') {
      e.preventDefault();
      // This will be handled by parent component or help system
      const event = new CustomEvent('showKeyboardHelp');
      window.dispatchEvent(event);
      return;
    }
  }, [selectedPersonId, getAdjacentNodeIds, onNodeClick, toggleCollapse, onToggleCollapse, 
      onEdit, onAddRelative, parentNodes, collapsedNodes]);

  // Register keyboard handler
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Register handlers with parent component
  useEffect(() => {
    if (onExpandCollapseAll) {
      onExpandCollapseAll(handleExpandCollapseAll);
    }
  }, [onExpandCollapseAll, handleExpandCollapseAll]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Expose export methods via ref
  useImperativeHandle(ref, () => ({
    exportSVG: (filename: string, includeMetadata = true) => {
      if (!svgRef.current) return;

      const svg = d3.select(svgRef.current);
      const clonedSvg = svg.node()!.cloneNode(true) as SVGElement;
      const clonedD3 = d3.select(clonedSvg);

      // Remove UI controls (toggles, badges, context menu)
      clonedD3.selectAll('.toggle-buttons').remove();
      clonedD3.selectAll('.count-badges').remove();

      // Add metadata if requested
      if (includeMetadata) {
        const metadata = clonedD3.insert('g', ':first-child')
          .attr('class', 'metadata')
          .attr('transform', 'translate(20, 20)');

        metadata.append('rect')
          .attr('width', 300)
          .attr('height', 80)
          .attr('fill', 'white')
          .attr('stroke', '#ccc')
          .attr('stroke-width', 1)
          .attr('rx', 4);

        metadata.append('text')
          .attr('x', 10)
          .attr('y', 25)
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .text(treeName || 'Family Tree');

        metadata.append('text')
          .attr('x', 10)
          .attr('y', 45)
          .attr('font-size', '12px')
          .text(`Date: ${new Date().toLocaleDateString()}`);

        metadata.append('text')
          .attr('x', 10)
          .attr('y', 65)
          .attr('font-size', '12px')
          .text(`People: ${data.nodes.length}`);
      }

      // Serialize and download
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },

    exportPNG: async (filename: string, includeMetadata = true) => {
      if (!svgRef.current) return;

      // Temporarily hide UI controls
      const svg = d3.select(svgRef.current);
      const toggles = svg.selectAll('.toggle-buttons');
      const badges = svg.selectAll('.count-badges');
      
      toggles.style('display', 'none');
      badges.style('display', 'none');

      // Add temporary metadata
      let metadataGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
      if (includeMetadata) {
        metadataGroup = svg.insert('g', ':first-child')
          .attr('class', 'temp-metadata')
          .attr('transform', 'translate(20, 20)');

        metadataGroup.append('rect')
          .attr('width', 300)
          .attr('height', 80)
          .attr('fill', 'white')
          .attr('stroke', '#ccc')
          .attr('stroke-width', 1)
          .attr('rx', 4);

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 25)
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .text(treeName || 'Family Tree');

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 45)
          .attr('font-size', '12px')
          .text(`Date: ${new Date().toLocaleDateString()}`);

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 65)
          .attr('font-size', '12px')
          .text(`People: ${data.nodes.length}`);
      }

      try {
        const canvas = await html2canvas(svgRef.current as unknown as HTMLElement);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
          }
        });
      } finally {
        // Restore UI controls
        toggles.style('display', null);
        badges.style('display', null);
        if (metadataGroup) {
          metadataGroup.remove();
        }
      }
    },

    exportPDF: async (filename: string, includeMetadata = true) => {
      if (!svgRef.current) return;

      // Temporarily hide UI controls
      const svg = d3.select(svgRef.current);
      const toggles = svg.selectAll('.toggle-buttons');
      const badges = svg.selectAll('.count-badges');
      
      toggles.style('display', 'none');
      badges.style('display', 'none');

      // Add temporary metadata
      let metadataGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
      if (includeMetadata) {
        metadataGroup = svg.insert('g', ':first-child')
          .attr('class', 'temp-metadata')
          .attr('transform', 'translate(20, 20)');

        metadataGroup.append('rect')
          .attr('width', 300)
          .attr('height', 80)
          .attr('fill', 'white')
          .attr('stroke', '#ccc')
          .attr('stroke-width', 1)
          .attr('rx', 4);

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 25)
          .attr('font-size', '16px')
          .attr('font-weight', 'bold')
          .text(treeName || 'Family Tree');

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 45)
          .attr('font-size', '12px')
          .text(`Date: ${new Date().toLocaleDateString()}`);

        metadataGroup.append('text')
          .attr('x', 10)
          .attr('y', 65)
          .attr('font-size', '12px')
          .text(`People: ${data.nodes.length}`);
      }

      try {
        const canvas = await html2canvas(svgRef.current as unknown as HTMLElement);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height],
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(filename);
      } finally {
        // Restore UI controls
        toggles.style('display', null);
        badges.style('display', null);
        if (metadataGroup) {
          metadataGroup.remove();
        }
      }
    },
  }), [data.nodes.length, treeName]);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const monitor = getPerformanceMonitor();
    const renderOpId = monitor.startOperation(`render-tree-${data.nodes.length}-nodes`);

    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    setIsTransitioning(true);

    // Animate opacity during transition
    svg.transition().duration(300).style('opacity', 0.6).on('end', () => {
      setIsTransitioning(false);
    });

    // Clear previous content after a slight delay for smooth transition
    setTimeout(() => {
      svg.selectAll('*').remove();

      const nodesData: NodeDatum[] = filteredNodes.map((d) => ({ ...d }));
      const edgesData: EdgeDatum[] = filteredEdges.map((d) => ({ ...d }));

      // Apply orientation-specific force configuration
      const isVertical = layoutOrientation === 'vertical';
      const centerX = isVertical ? width / 2 : width * 0.3;
      const centerY = isVertical ? height * 0.5 : height / 2;

      const simulation = d3
        .forceSimulation<NodeDatum, EdgeDatum>(nodesData)
        .force(
          'link',
          d3
            .forceLink<NodeDatum, EdgeDatum>(edgesData)
            .id((d) => d.id)
            .distance((link) => {
              if (link.type === 'spouse') return 80;
              return isVertical ? 150 : 200;
            })
            .strength(1)
        )
        .force('charge', d3.forceManyBody().strength(isVertical ? -400 : -500))
        .force('collision', d3.forceCollide().radius(12))
        .force('center', d3.forceCenter(centerX, centerY))
        .force(
          'y',
          isVertical
            ? d3.forceY(height / 2).strength(0.1)
            : d3.forceX(width / 2).strength(0.1)
        )
        .stop();

      // Run simulation for enough iterations to stabilize
      simulation.tick(300);

      const layoutNodes = simulation.nodes();
      const layoutEdges = (simulation.force('link') as d3.ForceLink<NodeDatum, EdgeDatum>).links();

      const toNode = (endpoint: EdgeDatum['source']): NodeDatum | null =>
        typeof endpoint === 'object' && endpoint ? (endpoint as NodeDatum) : null;

      const g = svg.append('g').attr('class', 'main-group');

      const edgesGroup = g.append('g').attr('class', 'edges');
      const nodesGroup = g
        .append('g')
        .selectAll('g.node')
        .data(layoutNodes)
        .join('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
        .attr('cursor', 'pointer')
        .attr('tabindex', '0')
        .attr('role', 'button')
        .attr('aria-label', (d) => d.displayName)
        .on('click', (_, d) => onNodeClick(d.id))
        .on('keydown', (event, d) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onNodeClick(d.id);
          }
        })
        .each(function () {
          // Touch event handling for mobile
          let touchStartTime = 0;
          let touchStartPos = { x: 0, y: 0 };
          let longPressTimer: number | null = null;

          d3.select(this)
            .on('touchstart', (event, d: any) => {
              event.preventDefault();
              touchStartTime = Date.now();
              const touch = event.touches[0];
              touchStartPos = { x: touch.clientX, y: touch.clientY };

              // Start a timer for long press
              if (longPressTimer) clearTimeout(longPressTimer);
              longPressTimer = window.setTimeout(() => {
                longPressTimer = null;
                const svgRect = svgRef.current!.getBoundingClientRect();
                setContextMenu({
                  x: (d.x ?? 0) - svgRect.left,
                  y: (d.y ?? 0) - svgRect.top,
                  nodeId: d.id,
                });
              }, 500);
            })
            .on('touchmove', (event) => {
              // If finger moves, it's a pan, not a long press or tap
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }
            })
            .on('touchend', (event, d: any) => {
              // Clear the long press timer
              if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
              }

              const touch = event.changedTouches[0];
              const dist = Math.sqrt(
                Math.pow(touch.clientX - touchStartPos.x, 2) +
                Math.pow(touch.clientY - touchStartPos.y, 2)
              );
              
              // If touch moved less than 10px and was less than 300ms, treat as a tap
              if (dist < 10 && Date.now() - touchStartTime < 300) {
                onNodeClick(d.id);
              }
            });
        });

      nodesGroup
        .append('circle')
        .attr('r', 8)
        .attr('fill', (d) =>
          directRelativeIds && (directRelativeIds.has(d.id) || d.id === selectedPersonId)
            ? 'var(--bs-primary-bg-subtle)'
            : 'var(--bs-light)'
        )
        .attr('stroke', (d) => (d.id === selectedPersonId ? ACCENT_COLOR : 'var(--bs-primary)'))
        .attr('stroke-width', (d) => (d.id === selectedPersonId ? 2.5 : 1.5))
        .attr('opacity', (d) => {
          if (!selectedPersonId) return 1;
          return d.id === selectedPersonId || (directRelativeIds && directRelativeIds.has(d.id)) ? 1 : 0.35;
        });

      nodesGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', -12)
        .attr('font-size', '10px')
        .attr('font-weight', (d) => (d.id === selectedPersonId ? 'bold' : 'normal'))
        .attr('fill', '#333')
        .attr('pointer-events', 'none')
        .style('user-select', 'none')
        .text((d) => d.displayName);

      const labels = nodesGroup.select('text'); // This is just for positioning below, no rendering

      // Manually set initial positions after simulation has run
      edges
        .attr('x1', (d: any) => toNode(d.source)?.x ?? 0)
        .attr('y1', (d: any) => toNode(d.source)?.y ?? 0)
        .attr('x2', (d: any) => toNode(d.target)?.x ?? 0)
        .attr('y2', (d: any) => toNode(d.target)?.y ?? 0);

      // Marriage connectors: draw small interlocked rings at midpoint
      const spouseEdges = layoutEdges.filter((e) => String(e.type) === 'spouse');
      const connectors = edgesGroup
        .selectAll('g.marriage-connector')
        .data(spouseEdges)
        .join('g')
        .attr('class', 'marriage-connector');

      connectors
        .append('circle')
        .attr('r', 6)
        .attr('fill', 'none')
        .attr('stroke', 'var(--bs-info)')
        .attr('stroke-width', 1.6);

      connectors
        .append('circle')
        .attr('r', 6)
        .attr('fill', 'none')
        .attr('stroke', 'var(--bs-info)')
        .attr('stroke-width', 1.6)
        .attr('transform', 'translate(6,0)');

      // nodesGroup is already translated, so circles and text are relative to 0,0
      // nodes.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);
      // labels.attr('x', (d) => d.x ?? 0).attr('y', (d) => (d.y ?? 0) - 12);


      // Add expand/collapse toggles for parent nodes
      const parentNodesData = layoutNodes.filter(d => parentNodes.has(d.id));
      const toggleGroup = g
        .append('g')
        .attr('class', 'toggle-buttons')
        .selectAll('g')
        .data(parentNodesData)
        .join('g')
        .attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`)
        .attr('cursor', 'pointer')
        .on('click', (event, d) => {
          event.stopPropagation();
          toggleCollapse(d.id);
        })
        .on('contextmenu', (event, d) => {
          event.preventDefault();
          event.stopPropagation();
          const svgRect = svgRef.current!.getBoundingClientRect();
          setContextMenu({
            x: event.clientX - svgRect.left,
            y: event.clientY - svgRect.top,
            nodeId: d.id
          });
        });

      // Toggle button background circle
      toggleGroup
        .append('circle')
        .attr('r', 10)
        .attr('cx', 14)
        .attr('cy', 0)
        .attr('fill', 'white')
        .attr('stroke', (d) => collapsedNodes.has(d.id) ? 'var(--bs-danger)' : 'var(--bs-success)')
        .attr('stroke-width', 1.5);

      // Toggle button icon (⊕ or ⊖)
      toggleGroup
        .append('text')
        .attr('x', 14)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', (d) => collapsedNodes.has(d.id) ? 'var(--bs-danger)' : 'var(--bs-success)')
        .attr('pointer-events', 'none')
        .text((d) => collapsedNodes.has(d.id) ? '⊕' : '⊖');

      // Count badges for collapsed nodes
      const collapsedNodesData = layoutNodes.filter(d => collapsedNodes.has(d.id) && parentNodes.has(d.id));
      const badgeGroup = g
        .append('g')
        .attr('class', 'count-badges')
        .selectAll('g')
        .data(collapsedNodesData)
        .join('g')
        .attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      // Badge background circle
      badgeGroup
        .append('circle')
        .attr('r', 8)
        .attr('cx', -14)
        .attr('cy', 0)
        .attr('fill', 'var(--bs-warning)')
        .attr('stroke', 'var(--bs-dark)')
        .attr('stroke-width', 1);

      // Badge count text
      badgeGroup
        .append('text')
        .attr('x', -14)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '9px')
        .attr('font-weight', 'bold')
        .attr('fill', 'var(--bs-dark)')
        .attr('pointer-events', 'none')
        .text((d) => {
          const count = descendantCounts.get(d.id) || 0;
          return count > 99 ? '99+' : count.toString();
        });

      // Position marriage connectors at midpoint
      connectors.attr('transform', (d: any) => {
        const sx = toNode(d.source)?.x ?? 0;
        const sy = toNode(d.source)?.y ?? 0;
        const tx = toNode(d.target)?.x ?? 0;
        const ty = toNode(d.target)?.y ?? 0;
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        return `translate(${mx - 3}, ${my})`;
      });

      // Create debounced transform handler for smooth zoom/pan performance
      const debouncedTransform = rafDebounce((transform: d3.ZoomTransform) => {
        g.attr('transform', transform.toString());
      });

      const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        // Call debounced handler for transform updates
        debouncedTransform(event.transform);
      });

      svg.call(zoom as any);
      svg.style('opacity', 1);

      // End performance measurement
      monitor.endOperation(renderOpId);
      const duration = monitor.getOperationMetrics(`render-tree-${data.nodes.length}-nodes`)?.duration || 0;
      if (duration > 100) {
        console.warn(`⚠️  Slow render detected: ${duration.toFixed(0)}ms for ${data.nodes.length} nodes`);
      }
    }, 350);

    return () => {
      // Cleanup handled by D3 selections
    };
  }, [filteredNodes, filteredEdges, selectedPersonId, relatedEdgeIds, onNodeClick, layoutOrientation, collapsedNodes, parentNodes, descendantCounts, toggleCollapse]);

  return (
    <>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
        }}
        tabIndex={0}
        aria-label="Family tree visualization"
      />
      {contextMenu && (
        <div
          style={{
            position: 'absolute',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '160px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="dropdown-item"
            style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => {
              handleExpandCollapseAll('expand');
              setContextMenu(null);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⊞ Expand All
          </button>
          <button
            className="dropdown-item"
            style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => {
              handleExpandCollapseAll('collapse');
              setContextMenu(null);
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ⊟ Collapse All
          </button>
          <div style={{ borderTop: '1px solid #dee2e6', margin: '4px 0' }}></div>
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              className="dropdown-item"
              style={{ padding: '8px 16px', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => {
                expandToLevel(level);
                setContextMenu(null);
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Expand to Level {level}
            </button>
          ))}
        </div>
      )}
    </>
  );
});

TreeCanvas.displayName = 'TreeCanvas';

