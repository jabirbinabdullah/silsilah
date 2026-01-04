import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RenderNode, RenderEdgeData } from '../api';

type PersonSearchProps = {
  nodes: RenderNode[];
  edges: RenderEdgeData[];
  currentPersonId: string;
  relatedIds?: { parents: Set<string>; children: Set<string>; spouses: Set<string> };
  onSelect: (personId: string) => void;
  onCreateNew?: () => void;
  height?: number; // px height for the list area
};

type PathStep = { type: 'parent-child' | 'spouse'; from: string; to: string };

function buildAdjacency(edges: RenderEdgeData[]) {
  const adj = new Map<string, Array<{ to: string; type: 'parent-child' | 'spouse' }>>();
  const add = (a: string, b: string, type: 'parent-child' | 'spouse') => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, type });
  };
  for (const e of edges) {
    if (e.type === 'spouse') {
      add(e.source, e.target, 'spouse');
      add(e.target, e.source, 'spouse');
    } else if (e.type === 'parent-child') {
      // allow traversal both directions for path display
      add(e.source, e.target, 'parent-child');
      add(e.target, e.source, 'parent-child');
    }
  }
  return adj;
}

function findPath(adj: Map<string, Array<{ to: string; type: 'parent-child' | 'spouse' }>>, start: string, goal: string): PathStep[] | null {
  if (start === goal) return [];
  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const prev = new Map<string, { from: string; type: 'parent-child' | 'spouse' }>();
  while (queue.length) {
    const u = queue.shift()!;
    const nbrs = adj.get(u) || [];
    for (const { to, type } of nbrs) {
      if (!visited.has(to)) {
        visited.add(to);
        prev.set(to, { from: u, type });
        if (to === goal) {
          // reconstruct
          const path: PathStep[] = [];
          let cur: string | undefined = goal;
          while (cur && prev.has(cur)) {
            const p = prev.get(cur)!;
            path.push({ type: p.type, from: p.from, to: cur });
            cur = p.from;
          }
          path.reverse();
          return path;
        }
        queue.push(to);
      }
    }
  }
  return null;
}

export const PersonSearch: React.FC<PersonSearchProps> = ({
  nodes,
  edges,
  currentPersonId,
  relatedIds,
  onSelect,
  onCreateNew,
  height = 320,
}) => {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemHeight = 72; // px per card

  const adj = useMemo(() => buildAdjacency(edges), [edges]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => n.displayName.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
  }, [nodes, query]);

  const total = filtered.length;
  const visibleCount = Math.max(1, Math.floor(height / itemHeight));
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(total, startIndex + visibleCount + 2); // buffer
  const visibleItems = filtered.slice(startIndex, endIndex);

  useEffect(() => {
    setHighlightIndex(0); // reset selection on new filter
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[highlightIndex];
      if (item) onSelect(item.id);
    }
  };

  const getPathText = (targetId: string): string | null => {
    const p = findPath(adj, currentPersonId, targetId);
    if (!p || p.length === 0) return null;
    const mapLabel = (step: PathStep) => (step.type === 'spouse' ? 'Spouse' : 'Parent–Child');
    return p.map(mapLabel).join(' → ');
  };

  const isRelated = (id: string): boolean => {
    if (!relatedIds) return false;
    return (
      relatedIds.parents.has(id) || relatedIds.children.has(id) || relatedIds.spouses.has(id)
    );
  };

  return (
    <div aria-label="Person search" onKeyDown={handleKeyDown}>
      <div className="mb-2">
        <label htmlFor="personSearchInput" className="form-label">Search</label>
        <input
          id="personSearchInput"
          className="form-control"
          placeholder="Search by name or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-controls="personSearchList"
        />
      </div>
      <div
        id="personSearchList"
        role="listbox"
        aria-label="Search results"
        className="border rounded"
        style={{ height: `${height}px`, overflowY: 'auto' }}
        ref={containerRef}
        onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      >
        {/* top spacer */}
        <div style={{ height: `${startIndex * itemHeight}px` }} />
        {visibleItems.map((n, idx) => {
          const globalIndex = startIndex + idx;
          const selected = globalIndex === highlightIndex;
          const related = isRelated(n.id);
          const pathText = getPathText(n.id);
          return (
            <div
              key={n.id}
              role="option"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={`d-flex align-items-center px-3 ${selected ? 'bg-primary text-white' : related ? 'bg-light' : ''}`}
              style={{ height: `${itemHeight}px`, cursor: 'pointer', borderBottom: '1px solid #eee' }}
              onMouseEnter={() => setHighlightIndex(globalIndex)}
              onClick={() => onSelect(n.id)}
            >
              <div className="me-3" aria-hidden="true">
                <div className="rounded-circle" style={{ width: 40, height: 40, background: '#ccc' }} />
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold">{n.displayName}</div>
                <div className={`small ${selected ? 'text-white-50' : 'text-muted'}`}>
                  {/* Birth/Death not available in render nodes; placeholder only */}
                  Birth/Death: —
                </div>
                {pathText && (
                  <div className={`small ${selected ? 'text-white-50' : 'text-muted'}`}>Path: {pathText}</div>
                )}
              </div>
              {related && (
                <span className={`badge ${selected ? 'bg-light text-dark' : 'bg-secondary'}`} title="Already related">
                  Related
                </span>
              )}
            </div>
          );
        })}
        {/* bottom spacer */}
        <div style={{ height: `${Math.max(0, (total - endIndex) * itemHeight)}px` }} />
        {total === 0 && (
          <div className="p-3 text-center text-muted">
            No results — create new person.
            {onCreateNew && (
              <div className="mt-2">
                <button className="btn btn-sm btn-success" onClick={onCreateNew} aria-label="Create new person">
                  Create New Person
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
