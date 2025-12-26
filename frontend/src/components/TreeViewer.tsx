import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicRenderData, type TreeRenderV1, RenderEdgeData } from '../api';
import { TreeCanvas } from './TreeCanvas';
import { TreeHierarchicalCanvas, TreeHierarchicalCanvasRef } from './TreeHierarchicalCanvas';
import { PersonDetailsDrawer } from './PersonDetailsDrawer';
import { AddPersonDrawer } from './AddPersonDrawer';
import { FamilyNode } from './PersonRelationships';

type ViewMode = 'network' | 'tree-vertical' | 'tree-horizontal';

function Toolbar({ 
  treeId, 
  onAddPerson, 
  viewMode, 
  onChangeView,
  searchQuery,
  onSearchChange,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  showZoomControls,
  onExportSVG,
  onExportPNG,
  currentDetailLevel,
  workerMode,
  onWorkerModeChange,
}: { 
  treeId: string; 
  onAddPerson: () => void; 
  viewMode: ViewMode; 
  onChangeView: (m: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  showZoomControls: boolean;
  onExportSVG: () => void;
  onExportPNG: () => void;
  currentDetailLevel: 'low' | 'medium' | 'high';
  workerMode: 'auto' | 'force-on' | 'force-off';
  onWorkerModeChange: (mode: 'auto' | 'force-on' | 'force-off') => void;
}) {
  return (
    <div className="px-3 py-2 bg-white border-bottom shadow-sm">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <Link to="/" className="btn btn-light">
            ← Back to Dashboard
          </Link>
          <h4 className="mb-0 text-muted">
            Tree: <span className="fw-bold text-dark">{treeId}</span>
          </h4>
          <input
            type="text"
            className="form-control"
            placeholder="Search person..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: '240px' }}
          />
        </div>
        <div className="d-flex align-items-center gap-2">
          {showZoomControls && (
            <div className="btn-group" role="group" aria-label="Zoom controls">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onZoomIn}
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onZoomReset}
                title="Reset Zoom"
              >
                ⊙
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onZoomOut}
                title="Zoom Out"
              >
                −
              </button>
            </div>
          )}
          <div className="btn-group" role="group" aria-label="View mode">
            <button
              type="button"
              className={`btn btn-outline-secondary ${viewMode === 'network' ? 'active' : ''}`}
              onClick={() => onChangeView('network')}
              title="Network View"
            >
              Network
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${viewMode === 'tree-vertical' ? 'active' : ''}`}
              onClick={() => onChangeView('tree-vertical')}
              title="Vertical Tree Layout"
            >
              ⬇ Tree
            </button>
            <button
              type="button"
              className={`btn btn-outline-secondary ${viewMode === 'tree-horizontal' ? 'active' : ''}`}
              onClick={() => onChangeView('tree-horizontal')}
              title="Horizontal Tree Layout"
            >
              ➡ Tree
            </button>
          </div>
          {viewMode !== 'network' && (
            <div className="btn-group" role="group" aria-label="Export">
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={onExportSVG}
                title="Export as SVG"
              >
                📊 SVG
              </button>
              <button
                type="button"
                className="btn btn-outline-success"
                onClick={onExportPNG}
                title="Export as PNG"
              >
                🖼️ PNG
              </button>
            </div>
          )}
          <button onClick={onAddPerson} className="btn btn-primary">
            + Add Person
          </button>
        </div>

        {/* Diagnostics: LOD and Worker Mode */}
        <div className="d-flex gap-2 align-items-center ms-auto">
          <span className="badge bg-secondary" title="Current Level of Detail">
            LOD: {currentDetailLevel.toUpperCase()}
          </span>
          <select
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
            value={workerMode}
            onChange={(e) => onWorkerModeChange(e.target.value as any)}
            title="Web Worker Mode"
          >
            <option value="auto">Worker: Auto</option>
            <option value="force-on">Worker: ON</option>
            <option value="force-off">Worker: OFF</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function HelpSidebar() {
  return (
    <div className="card h-100">
      <div className="card-body">
        <h5 className="card-title">How to Use</h5>
        <ul className="list-group list-group-flush">
          <li className="list-group-item">🖱️ Click node to set as root (tree view)</li>
          <li className="list-group-item">🔍 Hover over nodes for details</li>
          <li className="list-group-item">🔦 Hover highlights ancestor paths</li>
          <li className="list-group-item">🔎 Use search to find persons</li>
          <li className="list-group-item">➕ Zoom controls for navigation</li>
          <li className="list-group-item">💍 Dashed lines = marriage</li>
          <li className="list-group-item">⋯ Dotted lines = adoption</li>
        </ul>
      </div>
    </div>
  );
}

export function TreeViewer() {
  const { treeId = '' } = useParams();
  const [data, setData] = useState<TreeRenderV1 | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [searchQuery, setSearchQuery] = useState('');
  const [workerModeOverride, setWorkerModeOverride] = useState<'auto' | 'force-on' | 'force-off'>('auto');
  const [currentDetailLevel, setCurrentDetailLevel] = useState<'low' | 'medium' | 'high'>('high');
  const hierarchicalCanvasRef = useRef<TreeHierarchicalCanvasRef>(null);

  const fetchRenderData = useCallback(
    async (nextSelected?: string | null) => {
      setLoading(true);
      setError(null);

      try {
        const rawData = await getPublicRenderData(treeId);

        // Transform old format to new format if needed
        if (rawData.spouseEdges || rawData.parentChildEdges) {
          let edgeId = 0;
          const edges: RenderEdgeData[] = [];

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

        if (nextSelected !== undefined) {
          setSelectedPersonId(nextSelected);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [treeId],
  );

  useEffect(() => {
    fetchRenderData(null);
  }, [fetchRenderData, treeId]);

  const { parents, children, spouses, relatedEdgeIds } = useMemo(() => {
    if (!data || !selectedPersonId) {
      return {
        parents: [],
        children: [],
        spouses: [],
        relatedEdgeIds: new Set<string>(),
      };
    }
    const nodeIds = new Set(data.nodes.map((n) => n.id));
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));

    const parentOf = new Set<string>();
    const childOf = new Set<string>();
    const spouseOf = new Set<string>();
    const relatedEdges = new Set<string>();

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

    const toFamilyNode = (id: string): FamilyNode | undefined => {
      const node = nodeMap.get(id);
      return node ? { personId: node.id, displayName: node.displayName } : undefined;
    };

    return {
      parents: Array.from(parentOf).map(toFamilyNode).filter(Boolean) as FamilyNode[],
      children: Array.from(childOf).map(toFamilyNode).filter(Boolean) as FamilyNode[],
      spouses: Array.from(spouseOf).map(toFamilyNode).filter(Boolean) as FamilyNode[],
      relatedEdgeIds: relatedEdges,
    };
  }, [data, selectedPersonId]);

  const filteredNodes = useMemo(() => {
    if (!data || !searchQuery.trim()) return data?.nodes || [];
    const query = searchQuery.toLowerCase();
    return data.nodes.filter((n) => n.displayName.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const handleSetRoot = useCallback((personId: string) => {
    setSelectedPersonId(personId);
  }, []);

  const handleZoomIn = useCallback(() => {
    hierarchicalCanvasRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    hierarchicalCanvasRef.current?.zoomOut();
  }, []);

  const handleZoomReset = useCallback(() => {
    hierarchicalCanvasRef.current?.zoomReset();
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() && filteredNodes.length > 0) {
      const firstMatch = filteredNodes[0];
      setSelectedPersonId(firstMatch.id);
      hierarchicalCanvasRef.current?.centerOnNode(firstMatch.id);
    }
  }, [filteredNodes]);

  const handleExportSVG = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    hierarchicalCanvasRef.current?.exportSVG(`family-tree-${treeId}-${timestamp}.svg`);
  }, [treeId]);

  const handleExportPNG = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    hierarchicalCanvasRef.current?.exportPNG(`family-tree-${treeId}-${timestamp}.png`);
  }, [treeId]);

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 74px)' }}>
      <Toolbar
        treeId={treeId}
        onAddPerson={() => setAddDrawerOpen(true)}
        viewMode={viewMode}
        onChangeView={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        showZoomControls={viewMode !== 'network'}
        onExportSVG={handleExportSVG}
        onExportPNG={handleExportPNG}
        currentDetailLevel={currentDetailLevel}
        workerMode={workerModeOverride}
        onWorkerModeChange={setWorkerModeOverride}
      />

      <div className="flex-grow-1 position-relative">
        {loading && (
          <div className="position-absolute top-50 start-50 translate-middle text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading tree data…</p>
          </div>
        )}

        {error && (
          <div className="position-absolute top-50 start-50 translate-middle w-75">
            <div className="alert alert-danger">
              <h4 className="alert-heading">Error Loading Tree</h4>
              <p>{error}</p>
            </div>
          </div>
        )}

        {data && !loading && !error && (
          <div className="row g-0 h-100">
            <div className="col-9 h-100 position-relative">
              {viewMode === 'network' ? (
                <TreeCanvas
                  data={data}
                  selectedPersonId={selectedPersonId}
                  relatedEdgeIds={relatedEdgeIds}
                  onNodeClick={setSelectedPersonId}
                />
              ) : (
                <TreeHierarchicalCanvas
                  ref={hierarchicalCanvasRef}
                  data={data}
                  rootPersonId={selectedPersonId}
                  orientation={viewMode === 'tree-vertical' ? 'vertical' : 'horizontal'}
                  onNodeClick={setSelectedPersonId}
                  onSetRoot={handleSetRoot}
                  searchHighlight={searchQuery}
                  workerModeOverride={workerModeOverride}
                  onDetailLevelChange={setCurrentDetailLevel}
                />
              )}
            </div>
            <div className="col-3 h-100 p-3 bg-light border-start">
              <HelpSidebar />
            </div>
          </div>
        )}
      </div>

      <PersonDetailsDrawer
        treeId={treeId}
        personId={selectedPersonId}
        parents={parents}
        children={children}
        spouses={spouses}
        onClose={() => setSelectedPersonId(null)}
        onSelectPerson={setSelectedPersonId}
      />

      <AddPersonDrawer
        treeId={treeId}
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onCreated={(personId) => fetchRenderData(personId)}
      />
    </div>
  );
}
