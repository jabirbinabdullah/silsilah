import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { TreeRenderV1 } from '../api';

type TreeCanvasProps = {
  data: TreeRenderV1;
  selectedPersonId: string | null;
  relatedEdgeIds: Set<string>;
  onNodeClick: (personId: string) => void;
};

const ACCENT_COLOR = '#0ea5e9'; // blue-500

export const TreeCanvas: React.FC<TreeCanvasProps> = ({
  data,
  selectedPersonId,
  relatedEdgeIds,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create simulation
    const simulation = d3
      .forceSimulation<d3.SimulationNodeDatum>(
        data.nodes.map((d) => ({ ...d, id: d.id }))
      )
      .force('link', d3.forceLink<d3.SimulationNodeDatum, d3.SimulationLinkDatum<d3.SimulationNodeDatum>>()
        .id((d: d3.SimulationNodeDatum) => (d as any).id)
        .links(data.edges.map((d) => ({ source: d.source, target: d.target, type: d.type })))
        .distance((link: any) => (link.type === 'spouse' ? 60 : 100)))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .stop();

    // Run simulation for 300 iterations for better layout
    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    simRef.current = simulation;

    // Create SVG groups
    const g = svg.append('g').attr('class', 'main-group');

    // Draw edges
    const edges = g
      .selectAll('line')
      .data(data.edges)
      .enter()
      .append('line')
      .attr('x1', (d) => (d.source as any).x || 0)
      .attr('y1', (d) => (d.source as any).y || 0)
      .attr('x2', (d) => (d.target as any).x || 0)
      .attr('y2', (d) => (d.target as any).y || 0)
      .attr('stroke', (d) => {
        if (selectedPersonId && relatedEdgeIds.has(d.id)) {
          return ACCENT_COLOR;
        }
        return d.type === 'spouse' ? '#0ea5e9' : '#cbd5e1';
      })
      .attr('stroke-width', (d) => {
        if (selectedPersonId && relatedEdgeIds.has(d.id)) {
          return 3;
        }
        return 1.5;
      })
      .attr('opacity', (d) => {
        if (!selectedPersonId) return 1;
        return relatedEdgeIds.has(d.id) ? 1 : 0.2;
      });

    // Draw nodes
    const nodes = g
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('cx', (d) => (d as any).x || 0)
      .attr('cy', (d) => (d as any).y || 0)
      .attr('r', (d) => (d.id === selectedPersonId ? 10 : 7))
      .attr('fill', (d) => (d.id === selectedPersonId ? ACCENT_COLOR : '#3b82f6'))
      .attr('stroke', (d) => (d.id === selectedPersonId ? ACCENT_COLOR : '#1e40af'))
      .attr('stroke-width', (d) => (d.id === selectedPersonId ? 3 : 2))
      .attr('opacity', (d) => {
        if (!selectedPersonId) return 1;
        return d.id === selectedPersonId || relatedEdgeIds.has(d.id) ? 1 : 0.3;
      })
      .attr('cursor', 'pointer')
      .on('click', (_, d: d3.SimulationNodeDatum) => {
        onNodeClick((d as any).id);
      });

    // Draw labels
    const labels = g
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .attr('x', (d) => (d as any).x || 0)
      .attr('y', (d) => (d as any).y || 0)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.3em')
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.id === selectedPersonId ? 'bold' : 'normal'))
      .attr('fill', (d) => (d.id === selectedPersonId ? ACCENT_COLOR : '#1e293b'))
      .attr('opacity', (d) => {
        if (!selectedPersonId) return 1;
        return d.id === selectedPersonId || relatedEdgeIds.has(d.id) ? 1 : 0.4;
      })
      .text((d) => d.displayName)
      .attr('pointer-events', 'none');

    // Update simulation
    simulation.on('tick', () => {
      edges
        .attr('x1', (d) => (d.source as any).x || 0)
        .attr('y1', (d) => (d.source as any).y || 0)
        .attr('x2', (d) => (d.target as any).x || 0)
        .attr('y2', (d) => (d.target as any).y || 0);

      nodes
        .attr('cx', (d) => d.x || 0)
        .attr('cy', (d) => d.y || 0);

      labels
        .attr('x', (d) => d.x || 0)
        .attr('y', (d) => d.y || 0);
    });

    // Pan/zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Center selected node if available
    if (selectedPersonId && data.nodes.some((n) => n.id === selectedPersonId)) {
      setTimeout(() => {
        const selectedNode = data.nodes.find((n) => n.id === selectedPersonId);
        if (selectedNode && (selectedNode as any).x !== undefined) {
          const t = d3
            .zoomIdentity
            .translate(width / 2, height / 2)
            .scale(1.2)
            .translate(-(selectedNode as any).x, -(selectedNode as any).y);
          svg
            .transition()
            .duration(500)
            .call(zoom.transform as any, t);
        }
      }, 50);
    }

    return () => {
      simulation.stop();
    };
  }, [data, selectedPersonId, relatedEdgeIds]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#f9fafb',
      }}
    />
  );
};
