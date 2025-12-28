import React, { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as d3 from 'd3';
import type { TreeViewModel } from '../adapters/renderDataAdapter';
import { renderGenealogyNode } from './GenealogyNodeRenderer';
import type { LayoutResponse } from '../workers/treeLayoutWorker';
// For very large trees, offload layout computation to a worker
// Worker will accept nodes/edges and orientation, and return positioned hierarchy

type Orientation = 'vertical' | 'horizontal';

export type TreeHierarchicalCanvasRef = {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  centerOnNode: (nodeId: string) => void;
  exportSVG: (filename: string) => void;
  exportPNG: (filename: string) => void;
};

type TreeHierarchicalCanvasProps = {
  data: TreeViewModel;
  rootPersonId: string | null;
  orientation: Orientation;
  onNodeClick: (personId: string) => void;
  onSetRoot?: (personId: string) => void;
  branchKind?: 'ancestors' | 'descendants';
  searchHighlight?: string;
  workerModeOverride?: 'auto' | 'force-on' | 'force-off';
  onDetailLevelChange?: (level: 'low' | 'medium' | 'high') => void;
};

type TreeNode = {
  id: string;
  name: string;
  children: TreeNode[];
  _children?: TreeNode[]; // for D3 collapse pattern
};

export const TreeHierarchicalCanvas = forwardRef<TreeHierarchicalCanvasRef, TreeHierarchicalCanvasProps>(({
  data,
  rootPersonId,
  orientation,
  onNodeClick,
  onSetRoot,
  branchKind = 'descendants',
  searchHighlight = '',  workerModeOverride = 'auto',
  onDetailLevelChange,}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const [svgDimensions, setSvgDimensions] = useState({ width: 1000, height: 700 });
  const [currentTransform, setCurrentTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [layoutData, setLayoutData] = useState<LayoutResponse | null>(null);
  const [treeModelRoot, setTreeModelRoot] = useState<TreeNode | null>(null);
  const [version, setVersion] = useState(0); // bump to re-render after toggles
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; personId: string } | null>(null);

  // Simple debounce utility
  const debounce = useMemo(() => {
    return function<T extends (...args: any[]) => void>(fn: T, wait: number) {
      let t: any;
      return (...args: Parameters<T>) => {
        if (t) clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    };
  }, []);
  const debouncedSetTransformRef = useRef<(t: d3.ZoomTransform) => void>();
  if (!debouncedSetTransformRef.current) {
    debouncedSetTransformRef.current = debounce((t: d3.ZoomTransform) => {
      setCurrentTransform(t);
      setVersion((v) => v + 1);
    }, 80);
  }
  const debouncedSetSvgDimensionsRef = useRef<(w: number, h: number) => void>();
  if (!debouncedSetSvgDimensionsRef.current) {
    debouncedSetSvgDimensionsRef.current = debounce((w: number, h: number) => {
      setSvgDimensions({ width: w, height: h });
    }, 120);
  }

  const parentChildEdges = useMemo(
    () => data.edges.filter((e) => e.type === 'parent-child'),
    [data.edges]
  );

  const spouseEdges = useMemo(() => data.edges.filter((e) => e.type === 'spouse'), [data.edges]);
  const adoptionEdges = useMemo(
    () => data.edges.filter((e) => ((e as any).type === 'adoption' || (e as any).type === 'adoptive-parent')),
    [data.edges]
  );

  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    data.nodes.forEach((n) => m.set(n.id, n.displayName));
    return m;
  }, [data.nodes]);

  const rootId = useMemo(() => {
    if (rootPersonId) return rootPersonId;
    const children = new Set(parentChildEdges.map((e) => e.target));
    const candidates = data.nodes.map((n) => n.id).filter((id) => !children.has(id));
    return candidates[0] || (data.nodes[0]?.id ?? null);
  }, [rootPersonId, parentChildEdges, data.nodes]);

  const treeRoot: TreeNode | null = useMemo(() => {
    if (!rootId) return null;
    const childrenMap = new Map<string, string[]>();
    parentChildEdges.forEach((e) => {
      const arr = childrenMap.get(e.source) || [];
      arr.push(e.target);
      childrenMap.set(e.source, arr);
    });
    const visited = new Set<string>();
    const build = (id: string): TreeNode => {
      if (visited.has(id)) {
        return { id, name: idToName.get(id) || id, children: [] };
      }
      visited.add(id);
      const kids = (childrenMap.get(id) || []).filter((cid) => !visited.has(cid));
      return {
        id,
        name: idToName.get(id) || id,
        children: kids.map((cid) => build(cid)),
      };
    };
    return build(rootId);
  }, [rootId, parentChildEdges, idToName]);

  // Initialize or update the model root when the computed treeRoot changes
  useEffect(() => {
    setTreeModelRoot(treeRoot ? { ...treeRoot } : null);
    setVersion((v) => v + 1);
  }, [treeRoot]);

  // Expose zoom and navigation methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
      }
    },
    zoomOut: () => {
      if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.77);
      }
    },
    zoomReset: () => {
      if (svgRef.current && zoomBehaviorRef.current) {
        d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
      }
    },
    centerOnNode: (nodeId: string) => {
      if (svgRef.current && gRef.current && zoomBehaviorRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const width = rect.width || 1000;
        const height = rect.height || 700;
        
        // Find node element
        const nodeEl = gRef.current.select(`g.node[data-id="${nodeId}"]`).node() as SVGGElement | null;
        if (nodeEl) {
          const transform = nodeEl.getAttribute('transform');
          const match = transform?.match(/translate\(([^,]+),([^)]+)\)/);
          if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            const scale = 1.5;
            const translateX = width / 2 - x * scale;
            const translateY = height / 2 - y * scale;
            d3.select(svgRef.current)
              .transition()
              .duration(500)
              .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
          }
        }
      }
    },
    exportSVG: (filename: string) => {
      if (svgRef.current) {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'family-tree.svg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    },
    exportPNG: (filename: string) => {
      if (svgRef.current) {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const rect = svgRef.current.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        ctx.scale(scale, scale);
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = filename || 'family-tree.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      }
    },
  }), []);

  // Responsive resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 1000;
        const h = containerRef.current.clientHeight || 700;
        debouncedSetSvgDimensionsRef.current?.(w, h);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initial dimension setup on mount
  useEffect(() => {
    if (containerRef.current && (svgDimensions.width === 1000 && svgDimensions.height === 700)) {
      setSvgDimensions({
        width: containerRef.current.clientWidth || 1000,
        height: containerRef.current.clientHeight || 700,
      });
    }
  }, []);

  // Compute ancestor/descendant paths for hover highlighting
  const ancestorMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const visited = new Set<string>();
    
    const collectAncestors = (id: string, ancestors: Set<string>) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const parentSet = new Set<string>(ancestors);
      map.set(id, parentSet);
      
      parentChildEdges.forEach((e) => {
        if (e.target === id) {
          parentSet.add(e.source);
          collectAncestors(e.source, new Set([...parentSet, e.source]));
        }
      });
    };
    
    data.nodes.forEach((n) => collectAncestors(n.id, new Set()));
    return map;
  }, [data.nodes, parentChildEdges]);

  const toggle = (node: TreeNode) => {
    if (node.children && node.children.length) {
      node._children = node.children;
      node.children = [];
    } else if (node._children && node._children.length) {
      node.children = node._children;
      node._children = [];
    }
    setVersion((v) => v + 1);
  };

  // Compute layout using Web Worker for large trees, fallback locally otherwise
  useEffect(() => {
    if (!treeModelRoot) {
      setLayoutData(null);
      return;
    }
    const nodeCount = data.nodes.length;
    const nodeSizeX = 28;
    const nodeSizeY = 140;
    const shouldUseWorker = workerModeOverride === 'force-on' || (workerModeOverride === 'auto' && nodeCount >= 400);
    if (shouldUseWorker) {
      const worker = new Worker(new URL('../workers/treeLayoutWorker.ts', import.meta.url));
      worker.postMessage({ tree: treeModelRoot, nodeSizeX, nodeSizeY });
      const handler = (evt: MessageEvent<LayoutResponse>) => {
        setLayoutData(evt.data);
        worker.terminate();
      };
      worker.addEventListener('message', handler as any);
      return () => worker.terminate();
    } else {
      const hierarchy = d3.hierarchy<TreeNode>(treeModelRoot, (d) => d.children);
      const treeLayout = d3.tree<TreeNode>();
      treeLayout.nodeSize([nodeSizeX, nodeSizeY]);
      treeLayout(hierarchy);
      const descendants = hierarchy.descendants().map((d) => ({ id: d.data.id, name: d.data.name, depth: d.depth, x: (d as any).x as number, y: (d as any).y as number }));
      const links = hierarchy.links().map((l) => ({ sourceId: l.source.data.id, targetId: l.target.data.id }));
      setLayoutData({ descendants, links });
    }
  }, [treeModelRoot, data.nodes.length, workerModeOverride]);

  const render = () => {
    if (!svgRef.current || !treeModelRoot) return;

    const svg = d3.select(svgRef.current);
    const width = svgDimensions.width;
    const height = svgDimensions.height;

    // Set viewBox for responsive scaling
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.selectAll('*').remove();

    // Fixed spacing per depth for clear generation bands
    const nodeSizeX = 28; // vertical spacing between siblings (px)
    const nodeSizeY = 140; // per-generation separation (px)

    // Use precomputed layout from worker/local
    const descendants = (layoutData?.descendants ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      depth: d.depth,
      x: d.x,
      y: d.y,
      data: { id: d.id, name: d.name },
    }));

    // Early return if no layout data available yet
    if (descendants.length === 0) {
      return;
    }

    const g = svg.append('g').attr('class', 'main-group');
    gRef.current = g;

    // Compute transform for orientation
    const position = (d: any): { x: number; y: number } => {
      if (orientation === 'vertical') {
        // x spreads horizontally, y by depth vertically
        const margin = { top: 40, left: 40 };
        return { x: d.x + width / 2, y: d.y + margin.top };
      } else {
        // horizontal: x by depth, y spreads vertically
        const margin = { top: 40, left: 80 };
        return { x: d.y + margin.left, y: d.x + height / 2 };
      }
    };

    // Generation bands
    const depths = new Set<number>();
    descendants.forEach((d) => depths.add(d.depth));
    const maxDepth = Math.max(...Array.from(depths));
    const bandGroup = g.append('g').attr('class', 'bands');
    const labelGroup = g.append('g').attr('class', 'generation-labels');

    const labelForDepth = (depth: number): string => {
      if (branchKind === 'ancestors') {
        if (depth === 0) return 'Root';
        if (depth === 1) return 'Parents';
        if (depth === 2) return 'Grandparents';
        if (depth >= 3) return `${'Great-'.repeat(depth - 2)}Grandparents`;
        return `Generation ${depth}`;
      } else {
        if (depth === 0) return 'Root';
        if (depth === 1) return 'Children';
        if (depth === 2) return 'Grandchildren';
        if (depth >= 3) return `${'Great-'.repeat(depth - 2)}Grandchildren`;
        return `Generation ${depth}`;
      }
    };
    for (let depth = 0; depth <= maxDepth; depth++) {
      const bandPadding = 32;
      if (orientation === 'vertical') {
        const yStart = depth * nodeSizeY + bandPadding / 2;
        bandGroup
          .append('rect')
          .attr('x', 0)
          .attr('y', yStart)
          .attr('width', width)
          .attr('height', nodeSizeY - bandPadding)
          .attr('fill', depth % 2 === 0 ? 'var(--bs-primary-bg-subtle)' : 'var(--bs-secondary-bg)')
          .attr('opacity', 0.08);

        // Label on the left edge of the band
        labelGroup
          .append('text')
          .attr('x', 12)
          .attr('y', yStart + 18)
          .attr('fill', 'var(--bs-secondary)')
          .attr('font-size', 11)
          .attr('font-weight', depth === 0 ? 'bold' as any : 'normal')
          .text(labelForDepth(depth));
      } else {
        const xStart = depth * nodeSizeY + bandPadding / 2;
        bandGroup
          .append('rect')
          .attr('x', xStart)
          .attr('y', 0)
          .attr('width', nodeSizeY - bandPadding)
          .attr('height', height)
          .attr('fill', depth % 2 === 0 ? 'var(--bs-primary-bg-subtle)' : 'var(--bs-secondary-bg)')
          .attr('opacity', 0.08);

        // Label at the top edge of the band
        labelGroup
          .append('text')
          .attr('x', xStart + 8)
          .attr('y', 16)
          .attr('fill', 'var(--bs-secondary)')
          .attr('font-size', 11)
          .attr('font-weight', depth === 0 ? 'bold' as any : 'normal')
          .text(labelForDepth(depth));
      }
    }

    // Parent-child links (biological: solid)
    const linkGroup = g.append('g').attr('class', 'links');
    const nodesGroup = g.append('g').attr('class', 'nodes');

    const linkGenVertical = d3
      .linkVertical<any, any>()
      .x((d) => d.x)
      .y((d) => d.y);

    const linkGenHorizontal = d3
      .linkHorizontal<any, any>()
      .x((d) => d.x)
      .y((d) => d.y);

    // Determine detail level based on zoom scale
    const k = currentTransform.k;
    const detailLevel: 'low' | 'medium' | 'high' = k < 0.5 ? 'low' : k < 0.9 ? 'medium' : 'high';
    onDetailLevelChange?.(detailLevel);

    // Virtual rendering: cull off-screen nodes/links
    const marginCull = 80;
    const visibleDescendants = descendants.filter((d: any) => {
      const p = position(d as any);
      const vx = currentTransform.applyX(p.x);
      const vy = currentTransform.applyY(p.y);
      return vx >= -marginCull && vx <= width + marginCull && vy >= -marginCull && vy <= height + marginCull;
    });
    const visibleIds = new Set<string>(visibleDescendants.map((d: any) => d.id));
    const linksAll = (layoutData?.links ?? []);
    const links = linksAll.filter((l) => visibleIds.has(l.sourceId) || visibleIds.has(l.targetId));
    linkGroup
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', (d: any) => {
        const s = descendants.find((n: any) => n.id === d.sourceId)!;
        const t = descendants.find((n: any) => n.id === d.targetId)!;
        const ps = position(s as any);
        const pt = position(t as any);
        const obj = { source: ps, target: pt };
        return orientation === 'vertical' ? (linkGenVertical as any)(obj) : (linkGenHorizontal as any)(obj);
      })
      .attr('fill', 'none')
      .attr('stroke', (d) => {
        if (hoveredNodeId) {
          const ancestors = ancestorMap.get(hoveredNodeId) || new Set();
          if (ancestors.has(d.sourceId) && ancestors.has(d.targetId)) {
            return 'var(--bs-warning)';
          }
        }
        return 'var(--bs-secondary-border-subtle)';
      })
      .attr('stroke-width', (d) => {
        if (hoveredNodeId) {
          const ancestors = ancestorMap.get(hoveredNodeId) || new Set();
          if (ancestors.has(d.sourceId) && ancestors.has(d.targetId)) {
            return 3;
          }
        }
        return 1.5;
      })
      .attr('opacity', (d) => {
        if (hoveredNodeId) {
          const ancestors = ancestorMap.get(hoveredNodeId) || new Set();
          if (ancestors.has(d.sourceId) && ancestors.has(d.targetId)) {
            return 1;
          }
          return 0.3;
        }
        return 0.9;
      })
      .attr('stroke-dasharray', null);

    // Node positions map for overlays
    const posMap = new Map<string, { x: number; y: number }>();

    const nodesSel = nodesGroup
      .selectAll('g.node')
      .data(visibleDescendants as any)
      .join('g')
      .attr('class', 'node')
      .attr('data-id', (d: any) => d.id)
      .attr('transform', (d: any) => {
        const p = position(d as any);
        posMap.set(d.id, p);
        return `translate(${p.x},${p.y})`;
      })
      .style('opacity', (d) => {
        if (hoveredNodeId) {
          const ancestors = ancestorMap.get(hoveredNodeId) || new Set();
          if ((d as any).id === hoveredNodeId || ancestors.has((d as any).id)) {
            return 1;
          }
          return 0.3;
        }
        if (searchHighlight) {
          return (d as any).name.toLowerCase().includes(searchHighlight.toLowerCase()) ? 1 : 0.4;
        }
        return 1;
      })
      .on('mouseenter', function(event, d: any) {
        setHoveredNodeId(d.id);
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          setTooltip({
            x: event.clientX - svgRect.left,
            y: event.clientY - svgRect.top,
            personId: d.id,
          });
        }
      })
      .on('mouseleave', function() {
        setHoveredNodeId(null);
        setTooltip(null);
      })
      .on('click', function(event, d: any) {
        event.stopPropagation();
        if (onSetRoot) {
          onSetRoot(d.id);
        }
      });

    // Render comprehensive node cards
    nodesSel.call(renderGenealogyNode as any, {
      cardWidth: 160,
      cardHeight: 50,
      onClick: (id: string) => onNodeClick(id),
      onToggle: (id: string) => {
        const find = (n: TreeNode): TreeNode | null => {
          if (n.id === id) return n;
          for (const c of n.children) {
            const f = find(c);
            if (f) return f;
          }
          if (n._children) {
            for (const c of n._children) {
              const f = find(c);
              if (f) return f;
            }
          }
          return null;
        };
        const target = treeModelRoot ? find(treeModelRoot) : null;
        if (target) toggle(target);
      },
      showToggle: (d: any) => {
        const map = new Map<string, TreeNode>();
        const collect = (n: TreeNode) => {
          map.set(n.id, n);
          n.children.forEach(collect);
          (n._children || []).forEach(collect);
        };
        if (treeModelRoot) collect(treeModelRoot);
        const tn = map.get(d.data?.id ?? d.id);
        return !!(tn && ((tn.children && tn.children.length) || (tn._children && tn._children.length)));
      },
      datesFormatter: (b: any, d: any) => {
        const fmt = (x?: string | Date | null) => {
          if (!x) return null;
          const dd = typeof x === 'string' ? new Date(x) : x;
          if (Number.isNaN(dd.getTime())) return null;
          return dd.toLocaleDateString('en-US', { year: 'numeric' });
        };
        const bs = fmt(b);
        const ds = fmt(d);
        if (bs && ds) return `${bs} — ${ds}`;
        return bs || ds || '';
      },
      detailLevel,
    });

    // Spouse connectors (marriage: dashed) + indicators
    const spouseGroup = g.append('g').attr('class', 'spouses').attr('stroke-opacity', 0.8);
    spouseGroup
      .selectAll('line')
      .data(spouseEdges)
      .join('line')
      .attr('x1', (d) => posMap.get(d.source)?.x ?? 0)
      .attr('y1', (d) => posMap.get(d.source)?.y ?? 0)
      .attr('x2', (d) => posMap.get(d.target)?.x ?? 0)
      .attr('y2', (d) => posMap.get(d.target)?.y ?? 0)
      .attr('stroke-width', 2)
      .attr('stroke', 'var(--bs-blue)')
      .attr('stroke-dasharray', '6,4')
      .attr('opacity', (d) => (posMap.has(d.source) && posMap.has(d.target) ? 0.9 : 0));

    const spouseIndicatorGroup = g.append('g').attr('class', 'spouse-indicators');
    spouseIndicatorGroup
      .selectAll('g.rings')
      .data(spouseEdges.filter((e) => posMap.has(e.source) && posMap.has(e.target)))
      .join('g')
      .attr('class', 'rings')
      .attr('transform', (d) => {
        const s = posMap.get(d.source)!;
        const t = posMap.get(d.target)!;
        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2;
        return `translate(${mx},${my})`;
      })
      .each(function () {
        const sel = d3.select(this);
        sel
          .append('circle')
          .attr('r', 4)
          .attr('cx', -3)
          .attr('cy', 0)
          .attr('fill', 'none')
          .attr('stroke', 'var(--bs-warning)')
          .attr('stroke-width', 1.5);
        sel
          .append('circle')
          .attr('r', 4)
          .attr('cx', 3)
          .attr('cy', 0)
          .attr('fill', 'none')
          .attr('stroke', 'var(--bs-warning)')
          .attr('stroke-width', 1.5);
      });

    // Adoption connectors (dotted), if present
    const adoptionGroup = g.append('g').attr('class', 'adoptions').attr('stroke-opacity', 0.8);
    adoptionGroup
      .selectAll('line')
      .data(adoptionEdges)
      .join('line')
      .attr('x1', (d) => posMap.get(d.source)?.x ?? 0)
      .attr('y1', (d) => posMap.get(d.source)?.y ?? 0)
      .attr('x2', (d) => posMap.get(d.target)?.x ?? 0)
      .attr('y2', (d) => posMap.get(d.target)?.y ?? 0)
      .attr('stroke-width', 2)
      .attr('stroke', 'var(--bs-secondary)')
      .attr('stroke-dasharray', '2,6')
      .attr('opacity', (d) => (posMap.has(d.source) && posMap.has(d.target) ? 0.9 : 0));

    // Zoom/pan
    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
      debouncedSetTransformRef.current?.(event.transform);
    });
    zoomBehaviorRef.current = zoom;
    svg.call(zoom as any);
  };

  useEffect(() => {
    render();
  }, [data, orientation, rootId, treeModelRoot, version, onNodeClick, hoveredNodeId, ancestorMap, searchHighlight, onSetRoot, svgDimensions, currentTransform, layoutData]);

  const tooltipPerson = useMemo(() => {
    if (!tooltip) return null;
    return data.nodes.find((n) => n.id === tooltip.personId);
  }, [tooltip, data.nodes]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {tooltip && tooltipPerson && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: '220px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{tooltipPerson.displayName}</div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            ID: {tooltipPerson.id}
            <br />
            Click to set as root
            <br />
            Hover to see ancestor paths
          </div>
        </div>
      )}
    </div>
  );
});
