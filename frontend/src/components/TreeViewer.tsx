import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicRenderData, type TreeRenderV1 } from '../api';
import * as d3 from 'd3';

export function TreeViewer() {
  const { treeId = '' } = useParams();
  const [data, setData] = useState<TreeRenderV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    getPublicRenderData(treeId)
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [treeId]);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 900;
    const height = 600;

    const svg = d3
      .select(containerRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', '100%')
      .attr('height', height)
      .style('background', '#fff');

    svg.selectAll('*').remove();

    const nodes = data.nodes.map((n) => ({ id: n.id, label: n.displayName }));
    const edges = [
      ...data.parentChildEdges.map((e) => ({ source: e.personAId, target: e.personBId, type: 'PARENT_CHILD' })),
      ...data.spouseEdges.map((e) => ({ source: e.personAId, target: e.personBId, type: 'SPOUSE' })),
    ];

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const validEdges = edges.filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

    const sim = d3
      .forceSimulation(nodes as any)
      .force('link', d3.forceLink(validEdges as any).id((d: any) => d.id).distance((e: any) => (e.type === 'SPOUSE' ? 50 : 80)))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();

    const link = svg
      .append('g')
      .attr('stroke', '#aaa')
      .attr('stroke-width', 1.5)
      .selectAll('line')
      .data(validEdges)
      .enter()
      .append('line')
      .attr('x1', (d: any) => (nodeMap.get(d.source)?.x as number) || 0)
      .attr('y1', (d: any) => (nodeMap.get(d.source)?.y as number) || 0)
      .attr('x2', (d: any) => (nodeMap.get(d.target)?.x as number) || 0)
      .attr('y2', (d: any) => (nodeMap.get(d.target)?.y as number) || 0)
      .attr('stroke', (d: any) => (d.type === 'SPOUSE' ? '#0ea5e9' : '#94a3b8'));

    const nodeG = svg
      .append('g')
      .selectAll('g')
      .data(nodes as any)
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);

    nodeG
      .append('circle')
      .attr('r', 18)
      .attr('fill', '#f1f5f9')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1.5);

    nodeG
      .append('text')
      .text((d: any) => (d.label || d.id))
      .attr('text-anchor', 'middle')
      .attr('dy', 36)
      .attr('font-size', 11)
      .attr('fill', '#334155');

    return () => {
      svg.selectAll('*').remove();
    };
  }, [data]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/">
          <button style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>← Back</button>
        </Link>
        <h2 style={{ margin: 0, flex: 1 }}>Tree Viewer: {treeId}</h2>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      <svg ref={containerRef} style={{ width: '100%', minHeight: 600, border: '1px solid #eee', borderRadius: 8 }} />

      <div style={{ fontSize: 12, color: '#888' }}>Edges: blue = spouse, gray = parent-child</div>
    </div>
  );
}
