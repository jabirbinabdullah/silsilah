import { useMemo, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicRenderData, type TreeRenderV1, RenderEdgeData } from '../api';
import { TreeCanvas } from './TreeCanvas';
import { PersonDetailsDrawer, RelationshipCounts } from './PersonDetailsDrawer';
import { PersonRelationships, FamilyNode } from './PersonRelationships';

export function TreeViewer() {
  const { treeId = '' } = useParams();
  const [data, setData] = useState<TreeRenderV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Fetch tree data
  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    setSelectedPersonId(null);
    getPublicRenderData(treeId)
      .then((rawData) => {
        // Transform old format to new format if needed
        if (rawData.spouseEdges || rawData.parentChildEdges) {
          let edgeId = 0;
          const edges: RenderEdgeData[] = [];

          // Convert spouseEdges (old format)
          if (rawData.spouseEdges) {
            rawData.spouseEdges.forEach((edge) => {
              edges.push({
                id: `edge-${edgeId++}`,
                source: edge.personAId,
                target: edge.personBId,
                type: 'spouse',
              });
            });
          }

          // Convert parentChildEdges (old format)
          if (rawData.parentChildEdges) {
            rawData.parentChildEdges.forEach((edge) => {
              edges.push({
                id: `edge-${edgeId++}`,
                source: edge.personAId,
                target: edge.personBId,
                type: 'parent-child',
              });
            });
          }

          setData({
            ...rawData,
            edges,
          });
        } else {
          setData(rawData);
        }
      })
      .catch((e) => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [treeId]);

  // Derive relationships from tree data
  const { relationshipCounts, parents, children, spouses, relatedEdgeIds } = useMemo(() => {
    if (!data || !selectedPersonId) {
      return {
        relationshipCounts: { parents: 0, children: 0, spouses: 0 },
        parents: [],
        children: [],
        spouses: [],
        relatedEdgeIds: new Set<string>(),
      };
    }

    // Build index of node IDs for validation
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    // Build adjacency for relationships
    const parentOf = new Set<string>();
    const childOf = new Set<string>();
    const spouseOf = new Set<string>();
    const relatedEdges = new Set<string>();

    // Find parent-child relationships
    data.edges.forEach((edge) => {
      if (edge.type === 'parent-child') {
        if (edge.target === selectedPersonId && nodeIds.has(edge.source)) {
          parentOf.add(edge.source);
          relatedEdges.add(edge.id);
        }
        if (edge.source === selectedPersonId && nodeIds.has(edge.target)) {
          childOf.add(edge.target);
          relatedEdges.add(edge.id);
        }
      }
    });

    // Find spouse relationships
    data.edges.forEach((edge) => {
      if (edge.type === 'spouse') {
        if (edge.source === selectedPersonId && nodeIds.has(edge.target)) {
          spouseOf.add(edge.target);
          relatedEdges.add(edge.id);
        }
        if (edge.target === selectedPersonId && nodeIds.has(edge.source)) {
          spouseOf.add(edge.source);
          relatedEdges.add(edge.id);
        }
      }
    });

    const parentsList: FamilyNode[] = Array.from(parentOf)
      .map((id) => nodeMap.get(id)!)
      .filter(Boolean)
      .map((n) => ({ personId: n.id, displayName: n.displayName }));

    const childrenList: FamilyNode[] = Array.from(childOf)
      .map((id) => nodeMap.get(id)!)
      .filter(Boolean)
      .map((n) => ({ personId: n.id, displayName: n.displayName }));

    const spousesList: FamilyNode[] = Array.from(spouseOf)
      .map((id) => nodeMap.get(id)!)
      .filter(Boolean)
      .map((n) => ({ personId: n.id, displayName: n.displayName }));

    return {
      relationshipCounts: {
        parents: parentsList.length,
        children: childrenList.length,
        spouses: spousesList.length,
      },
      parents: parentsList,
      children: childrenList,
      spouses: spousesList,
      relatedEdgeIds: relatedEdges,
    };
  }, [data, selectedPersonId]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/">
            <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-sm font-medium transition-colors">
              ← Back
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tree: {treeId}</h1>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-600">Loading tree data…</div>
        </div>
      )}

      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-4 text-red-700">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      {data && !loading && !error && (
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <div className="flex-1 bg-gray-100 relative">
            <TreeCanvas
              data={data}
              selectedPersonId={selectedPersonId}
              relatedEdgeIds={relatedEdgeIds}
              onNodeClick={setSelectedPersonId}
            />
          </div>

          {/* Drawer */}
          <PersonDetailsDrawer
            treeId={treeId}
            personId={selectedPersonId}
            relationshipCounts={relationshipCounts}
            onClose={() => setSelectedPersonId(null)}
            onSelectPerson={setSelectedPersonId}
          />

          {/* Sidebar when drawer isn't visible */}
          {!selectedPersonId && (
            <div className="w-72 bg-white border-l border-gray-200 p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">●</span>
                  <span>Click any node to view person details</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">●</span>
                  <span>Blue edges connect spouses, gray edges show parent-child</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">●</span>
                  <span>Click related names in the drawer to navigate</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">●</span>
                  <span>Scroll and zoom to explore the tree</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
