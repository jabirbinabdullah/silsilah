import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import type { TreeViewModel } from '../adapters/renderDataAdapter';

type TimelineViewProps = {
  data: TreeViewModel;
  selectedPersonId: string | null;
  onNodeClick: (personId: string) => void;
  relatedEdgeIds: Set<string>;
  directRelativeIds?: Set<string>;
};

type PersonLifespan = {
  id: string;
  displayName: string;
  birthYear: number | null;
  deathYear: number | null;
  generation: number;
  events: Array<{ type: 'birth' | 'marriage' | 'death'; year: number; label: string }>;
};

const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

export const TimelineView: React.FC<TimelineViewProps> = ({
  data,
  selectedPersonId,
  onNodeClick,
  relatedEdgeIds,
  directRelativeIds,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentTransform, setCurrentTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Calculate generations using BFS from root nodes
  const generations = useMemo(() => {
    const genMap = new Map<string, number>();
    const roots = data.nodes.filter(node => {
      return !data.edges.some(edge =>
        edge.type === 'parent-child' &&
        (typeof edge.target === 'string' ? edge.target : (edge.target as any).id) === node.id
      );
    });

    const queue: Array<{ id: string; gen: number }> = roots.map(r => ({ id: r.id, gen: 0 }));
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, gen } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      genMap.set(id, gen);

      // Find children
      data.edges.forEach(edge => {
        if (edge.type === 'parent-child') {
          const parentId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
          const childId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
          if (parentId === id && !visited.has(childId)) {
            queue.push({ id: childId, gen: gen + 1 });
          }
        }
      });
    }

    return genMap;
  }, [data.nodes, data.edges]);

  // Extract lifespan data from nodes
  const lifespans = useMemo((): PersonLifespan[] => {
    return data.nodes.map(node => {
      const events: PersonLifespan['events'] = [];

      // For now, generate estimated dates based on generation
      // In a real implementation, this would come from the API with full person data
      const generation = generations.get(node.id) ?? 0;
      const baseYear = 1920;
      const generationSpan = 30;
      const estimatedBirth = baseYear + (generation * generationSpan) + Math.floor(Math.random() * 20);
      const estimatedDeath = estimatedBirth + 70 + Math.floor(Math.random() * 20);

      const birthYear = estimatedBirth;
      const deathYear = estimatedDeath > new Date().getFullYear() ? null : estimatedDeath;

      if (birthYear) {
        events.push({ type: 'birth', year: birthYear, label: `Born ${birthYear}` });
      }

      if (deathYear) {
        events.push({ type: 'death', year: deathYear, label: `Died ${deathYear}` });
      }

      // Find marriage years from spouse edges
      data.edges.forEach(edge => {
        if (edge.type === 'spouse') {
          const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
          const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
          if (sourceId === node.id || targetId === node.id) {
            // Estimate marriage at age ~25
            const marriageYear = birthYear + 25;
            events.push({ type: 'marriage', year: marriageYear, label: `Married ${marriageYear}` });
          }
        }
      });

      return {
        id: node.id,
        displayName: node.displayName,
        birthYear,
        deathYear,
        generation: generations.get(node.id) ?? 0,
        events,
      };
    }); // Show all people with estimated dates
  }, [data.nodes, data.edges, generations]);

  // Calculate year range
  const yearRange = useMemo(() => {
    if (lifespans.length === 0) return { min: 1900, max: 2025 };
    
    const years = lifespans.flatMap(p => [p.birthYear, p.deathYear].filter(y => y !== null) as number[]);
    const min = Math.min(...years) - 10;
    const max = Math.max(...years, new Date().getFullYear()) + 10;
    
    return { min, max };
  }, [lifespans]);

  useEffect(() => {
    if (!svgRef.current || lifespans.length === 0) return;

    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 1000;
    const height = rect.height || 600;
    const margin = { top: 40, right: 40, bottom: 60, left: 200 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.selectAll('*').remove();

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([yearRange.min, yearRange.max])
      .range([0, innerWidth]);

    const yScale = d3.scaleBand()
      .domain(lifespans.map(p => p.id))
      .range([0, innerHeight])
      .padding(0.2);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 10])
      .translateExtent([[-margin.left, -margin.top], [width + margin.right, height + margin.bottom]])
      .on('zoom', (event) => {
        setCurrentTransform(event.transform);
        g.attr('transform', event.transform);
        gx.call(xAxis.scale(event.transform.rescaleX(xScale)));
      });

    svg.call(zoom as any);

    const g = svg.append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => d.toString())
      .ticks(10);

    const gx = svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(${margin.left},${margin.top + innerHeight})`)
      .call(xAxis);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(id => {
        const person = lifespans.find(p => p.id === id);
        return person?.displayName || id;
      });

    svg.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '11px')
      .style('cursor', 'pointer')
      .on('click', (_, id) => onNodeClick(id as string));

    // Draw lifespan bars
    const bars = g.selectAll('.lifespan-bar')
      .data(lifespans)
      .join('rect')
      .attr('class', 'lifespan-bar')
      .attr('x', d => xScale(d.birthYear!))
      .attr('y', d => yScale(d.id)!)
      .attr('width', d => {
        const endYear = d.deathYear || new Date().getFullYear();
        return Math.max(2, xScale(endYear) - xScale(d.birthYear!));
      })
      .attr('height', yScale.bandwidth())
      .attr('fill', d => {
        if (d.id === selectedPersonId) return '#0d6efd';
        if (directRelativeIds && directRelativeIds.has(d.id)) return '#0dcaf0';
        return COLORS[d.generation % COLORS.length];
      })
      .attr('opacity', d => {
        if (!selectedPersonId) return 0.7;
        return d.id === selectedPersonId || (directRelativeIds && directRelativeIds.has(d.id)) ? 1 : 0.3;
      })
      .attr('stroke', d => d.id === selectedPersonId ? '#000' : 'none')
      .attr('stroke-width', d => d.id === selectedPersonId ? 2 : 0)
      .attr('rx', 3)
      .attr('cursor', 'pointer')
      .on('click', (_, d) => onNodeClick(d.id))
      .on('mouseenter', function() {
        d3.select(this).attr('opacity', 1);
      })
      .on('mouseleave', function(_, d) {
        if (!selectedPersonId) {
          d3.select(this).attr('opacity', 0.7);
        } else {
          d3.select(this).attr('opacity', 
            d.id === selectedPersonId || (directRelativeIds && directRelativeIds.has(d.id)) ? 1 : 0.3
          );
        }
      });

    // Add tooltips
    bars.append('title')
      .text(d => {
        const birth = d.birthYear || '?';
        const death = d.deathYear || 'present';
        return `${d.displayName}\n${birth} - ${death}`;
      });

    // Draw event markers
    const eventGroups = g.selectAll('.event-group')
      .data(lifespans.flatMap(p => 
        p.events.map(e => ({ ...e, personId: p.id, personName: p.displayName }))
      ))
      .join('g')
      .attr('class', 'event-group')
      .attr('transform', d => {
        const person = lifespans.find(p => p.id === d.personId)!;
        return `translate(${xScale(d.year)},${yScale(d.personId)! + yScale.bandwidth() / 2})`;
      });

    eventGroups.each(function (d) {
      const group = d3.select(this);
      const size = 4;

      // Clear any previous shapes
      group.selectAll('path, circle').remove();

      let marker;
      switch (d.type) {
        case 'birth':
          marker = group.append('circle')
            .attr('r', size);
          break;
        case 'marriage':
          marker = group.append('path')
            .attr('d', `M0,-${size} L${size},0 L0,${size} L-${size},0 Z`); // Diamond
          break;
        case 'death':
          marker = group.append('path')
            .attr('d', `M-${size-1},-${size-1}L${size-1},${size-1}M${size-1},-${size-1}L-${size-1},${size-1}`)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round');
          break;
      }
      
      if (marker) {
        marker
          .attr('fill', d.type === 'death' ? 'none' : (d.type === 'birth' ? '#28a745' : '#ffc107'))
          .attr('stroke', d.type === 'death' ? '#dc3545' : '#fff')
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer');
      }
    });

    eventGroups.append('title')
      .text(d => `${d.personName}: ${d.label}`);

    // Add legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 150}, 10)`);

    const legendData = [
      { type: 'birth', label: 'Birth', color: '#28a745' },
      { type: 'marriage', label: 'Marriage', color: '#ffc107' },
      { type: 'death', label: 'Death', color: '#dc3545' },
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      const size = 4;

      switch (item.type) {
        case 'birth':
          legendRow.append('circle')
            .attr('r', size)
            .attr('fill', item.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
          break;
        case 'marriage':
          legendRow.append('path')
            .attr('d', `M0,-${size} L${size},0 L0,${size} L-${size},0 Z`)
            .attr('fill', item.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
          break;
        case 'death':
          legendRow.append('path')
            .attr('d', `M-${size-1},-${size-1}L${size-1},${size-1}M${size-1},-${size-1}L-${size-1},${size-1}`)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'round')
            .attr('fill', 'none')
            .attr('stroke', item.color);
          break;
      }

      legendRow.append('text')
        .attr('x', 10)
        .attr('y', 5)
        .style('font-size', '12px')
        .text(item.label);
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [lifespans, yearRange, selectedPersonId, directRelativeIds, onNodeClick]);

  // Zoom controls
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      0.77
    );
  };

  const handleZoomReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
  };

  if (lifespans.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="text-center">
          <p className="text-muted">No timeline data available</p>
          <small className="text-muted">People need birth dates to appear on the timeline</small>
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative h-100">
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />
      <div
        className="position-absolute"
        style={{ top: 10, right: 10, zIndex: 10 }}
      >
        <div className="btn-group-vertical" role="group">
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleZoomReset}
            title="Reset Zoom"
          >
            ⊙
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
};
