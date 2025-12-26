import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TreeRenderV1, RenderEdgeData } from '../api';

type TreeCanvasProps = {
  data: TreeRenderV1;
  selectedPersonId: string | null;
  relatedEdgeIds: Set<string>;
  onNodeClick: (personId: string) => void;
};

const ACCENT_COLOR = '#0d6efd'; // Bootstrap Primary

type NodeDatum = d3.SimulationNodeDatum & {
  id: string;
  displayName: string;
};

type EdgeDatum = d3.SimulationLinkDatum<NodeDatum> & RenderEdgeData;

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  data,
  selectedPersonId,
  relatedEdgeIds,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    // Clear previous content
    svg.selectAll('*').remove();

    const nodesData: NodeDatum[] = data.nodes.map((d) => ({ ...d }));
    const edgesData: EdgeDatum[] = data.edges.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation<NodeDatum, EdgeDatum>(nodesData)
      .force(
        'link',
        d3
          .forceLink<NodeDatum, EdgeDatum>(edgesData)
          .id((d) => d.id)
          .distance((link) => (link.type === 'spouse' ? 80 : 150))
          .strength(1)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('collision', d3.forceCollide().radius(12))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .stop();

    // Run simulation for enough iterations to stabilize
    simulation.tick(300);

    const layoutNodes = simulation.nodes();
    const layoutEdges = (simulation.force('link') as d3.ForceLink<NodeDatum, EdgeDatum>).links();

    const toNode = (endpoint: EdgeDatum['source']): NodeDatum | null =>
      typeof endpoint === 'object' && endpoint ? (endpoint as NodeDatum) : null;

    const g = svg.append('g').attr('class', 'main-group');

    const edges = g
      .append('g')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(layoutEdges)
      .join('line')
      .attr('stroke-width', (d) => (relatedEdgeIds.has(d.id) ? 2.5 : 1.5))
      .attr('stroke', (d) =>
        d.type === 'spouse' ? 'var(--bs-blue)' : 'var(--bs-secondary-border-subtle)'
      )
      .attr('opacity', (d) => (!selectedPersonId || relatedEdgeIds.has(d.id) ? 1 : 0.2));

    const nodes = g
      .append('g')
      .selectAll('circle')
      .data(layoutNodes)
      .join('circle')
      .attr('r', 8)
      .attr('fill', 'var(--bs-primary-bg-subtle)')
      .attr('stroke', (d) => (d.id === selectedPersonId ? ACCENT_COLOR : 'var(--bs-primary)'))
      .attr('stroke-width', (d) => (d.id === selectedPersonId ? 2.5 : 1.5))
      .attr('opacity', (d) => {
        if (!selectedPersonId) return 1;
        return d.id === selectedPersonId || data.edges.some(e => (e.source === d.id || e.target === d.id) && relatedEdgeIds.has(e.id)) ? 1 : 0.3;
      })
      .attr('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick(d.id));

    const labels = g
      .append('g')
      .selectAll('text')
      .data(layoutNodes)
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', (d) => (d.id === selectedPersonId ? 'bold' : 'normal'))
      .attr('fill', '#333')
      .attr('pointer-events', 'none')
      .style('user-select', 'none')
      .text((d) => d.displayName);

    // Static layout: we manually set positions after ticking

    // Manually set initial positions after simulation has run
    edges
      .attr('x1', (d) => toNode(d.source)?.x ?? 0)
      .attr('y1', (d) => toNode(d.source)?.y ?? 0)
      .attr('x2', (d) => toNode(d.target)?.x ?? 0)
      .attr('y2', (d) => toNode(d.target)?.y ?? 0);

    nodes.attr('cx', (d) => d.x ?? 0).attr('cy', (d) => d.y ?? 0);

    labels.attr('x', (d) => d.x ?? 0).attr('y', (d) => (d.y ?? 0) - 12);

    const zoom = d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

    svg.call(zoom as any);

    return () => {
      simulation.stop();
    };
  }, [data, selectedPersonId, relatedEdgeIds, onNodeClick]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
