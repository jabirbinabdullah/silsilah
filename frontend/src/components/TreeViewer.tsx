import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPublicRenderData } from '../api';
import { RenderDataAdapter, type TreeViewModel, type HierarchyViewModel } from '../adapters/renderDataAdapter';
import { TreeCanvas, TreeCanvasRef } from './TreeCanvas';
import { HierarchicalTreeCanvas } from './HierarchicalTreeCanvas';
import { PersonDetailsDrawer } from './PersonDetailsDrawer';
import { AddPersonDrawer } from './AddPersonDrawer';
import { RelationshipManager } from './RelationshipManager';
import { FamilyNode } from './PersonRelationships';
import { RelationshipEditDrawer } from './RelationshipEditDrawer';
import { EditPersonDrawer } from './EditPersonDrawer';
import { TimelineView } from './TimelineView';
import { useUndoRedo, UndoRedoAction } from '../hooks/useUndoRedo';
import { useToast } from './ToastNotification';
import { useCollaboration } from '../context/CollaborationContext';
import { PresenceBar, PresenceIndicators } from './PresenceIndicators';
import { ActivityFeed, CompactActivityFeed } from './ActivityFeed';
import { EditConflictWarning, EditConflictModal, PersonEditingIndicator } from './EditConflictWarning';
import StatisticsSidebar from './StatisticsSidebar';
import { calculateTreeStatistics, type TreeStatistics, type PersonStats } from '../utils/statisticsCalculator';

type ViewMode = 'network' | 'tree-vertical' | 'tree-horizontal' | 'timeline';

function Toolbar({ 
  treeId, 
  onAddPerson, 
  onAddRelationship,
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
  onExportPDF,
  currentDetailLevel,
  workerMode,
  onWorkerModeChange,
  layoutOrientation,
  onLayoutChange,
  onExpandAll,
  onCollapseAll,
  isExporting,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: { 
  treeId: string; 
  onAddPerson: () => void; 
  onAddRelationship: () => void;
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
  onExportPDF?: () => void;
  currentDetailLevel: 'low' | 'medium' | 'high';
  workerMode: 'auto' | 'force-on' | 'force-off';
  onWorkerModeChange: (mode: 'auto' | 'force-on' | 'force-off') => void;
  layoutOrientation?: 'vertical' | 'horizontal';
  onLayoutChange?: (orientation: 'vertical' | 'horizontal') => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  isExporting?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const [showExportDropdown, setShowExportDropdown] = React.useState(false);
  const exportDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportDropdown]);

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
            <button
              type="button"
              className={`btn btn-outline-secondary ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => onChangeView('timeline')}
              title="Timeline View"
            >
              📅 Timeline
            </button>
          </div>
          {viewMode === 'network' && onLayoutChange && (
            <div className="btn-group" role="group" aria-label="Network layout orientation">
              <button
                type="button"
                className={`btn btn-outline-info ${layoutOrientation === 'vertical' ? 'active' : ''}`}
                onClick={() => onLayoutChange('vertical')}
                title="Vertical Layout"
              >
                ⬇ Vertical
              </button>
              <button
                type="button"
                className={`btn btn-outline-info ${layoutOrientation === 'horizontal' ? 'active' : ''}`}
                onClick={() => onLayoutChange('horizontal')}
                title="Horizontal Layout"
              >
                ➡ Horizontal
              </button>
            </div>
          )}
          {viewMode === 'network' && (
            <div className="btn-group" role="group" aria-label="Branch controls">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onExpandAll}
                title="Expand All Branches"
              >
                ⊞ Expand All
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCollapseAll}
                title="Collapse All Branches"
              >
                ⊟ Collapse All
              </button>
            </div>
          )}
          {viewMode === 'network' && (
            <div className="position-relative" ref={exportDropdownRef}>
              <button
                type="button"
                className="btn btn-outline-success dropdown-toggle"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                title="Export Network View"
              >
                {isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Exporting...
                  </>
                ) : (
                  <>📊 Export</>
                )}
              </button>
              {showExportDropdown && !isExporting && (
                <div
                  className="dropdown-menu show"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    zIndex: 1000,
                  }}
                >
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onExportSVG();
                      setShowExportDropdown(false);
                    }}
                  >
                    📄 Export as SVG
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      onExportPNG();
                      setShowExportDropdown(false);
                    }}
                  >
                    🖼️ Export as PNG
                  </button>
                  {onExportPDF && (
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onExportPDF();
                        setShowExportDropdown(false);
                      }}
                    >
                      📑 Export as PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
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
            <div className="btn-group" role="group" aria-label="Undo/Redo">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                ↶ Undo
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
              >
                ↷ Redo
              </button>
            </div>
            <div className="btn-group" role="group" aria-label="Add actions">
              <button onClick={onAddPerson} className="btn btn-primary">
                + Add Person
              </button>
              <button onClick={onAddRelationship} className="btn btn-outline-primary">
                + Parent–Child
              </button>
            </div>
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
        
        <h6 className="mt-3 mb-2">Mouse Controls</h6>
        <ul className="list-group list-group-flush">
          <li className="list-group-item">🖱️ Click node to set as root (tree view)</li>
          <li className="list-group-item">🔍 Hover over nodes for details</li>
          <li className="list-group-item">🔦 Hover highlights ancestor paths</li>
          <li className="list-group-item">🔎 Use search to find persons</li>
          <li className="list-group-item">➕ Zoom controls for navigation</li>
        </ul>

        <h6 className="mt-3 mb-2">Keyboard Shortcuts</h6>
        <ul className="list-group list-group-flush">
          <li className="list-group-item"><kbd>↑↓←→</kbd> Navigate nodes</li>
          <li className="list-group-item"><kbd>Enter</kbd> / <kbd>Space</kbd> Select/confirm</li>
          <li className="list-group-item"><kbd>+</kbd> Expand subtree</li>
          <li className="list-group-item"><kbd>-</kbd> Collapse subtree</li>
          <li className="list-group-item"><kbd>E</kbd> Edit selected person</li>
          <li className="list-group-item"><kbd>A</kbd> Add relative</li>
          <li className="list-group-item"><kbd>Esc</kbd> Deselect node</li>
        </ul>

        <h6 className="mt-3 mb-2">Legend</h6>
        <ul className="list-group list-group-flush">
          <li className="list-group-item">💍 Dashed lines = marriage</li>
          <li className="list-group-item">⋯ Dotted lines = adoption</li>
        </ul>
      </div>
    </div>
  );
}

export function TreeViewer() {
  const { treeId = '' } = useParams();
  const [data, setData] = useState<TreeViewModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [relationshipManagerOpen, setRelationshipManagerOpen] = useState(false);
  const [edgeEditorOpen, setEdgeEditorOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<RenderEdgeData | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('network');
  const [searchQuery, setSearchQuery] = useState('');
  const [workerModeOverride, setWorkerModeOverride] = useState<'auto' | 'force-on' | 'force-off'>('auto');
  const [currentDetailLevel, setCurrentDetailLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    const stored = localStorage.getItem('silsilah:networkLayoutOrientation');
    return (stored as 'vertical' | 'horizontal') || 'vertical';
  });
  const [hierarchy, setHierarchy] = useState<HierarchyViewModel | null>(null);
  // Hierarchical canvas does not expose imperative API; keep ref optional
  const hierarchicalCanvasRef = useRef<any>(null);
  const networkCanvasRef = useRef<TreeCanvasRef>(null);
  const expandCollapseHandlerRef = useRef<((action: 'expand' | 'collapse') => void) | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const undoRedo = useUndoRedo();
  const { addToast } = useToast();
  
  // Collaboration features
  const collaboration = useCollaboration();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [activePersonEditors, setActivePersonEditors] = useState<Map<string, string>>(new Map());
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState<TreeStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);

  // Store expand/collapse handler from TreeCanvas
  const handleExpandCollapseAll = useCallback((handler: (action: 'expand' | 'collapse') => void) => {
    expandCollapseHandlerRef.current = handler;
  }, []);

  // Expand all branches
  const handleExpandAll = useCallback(() => {
    if (expandCollapseHandlerRef.current) {
      expandCollapseHandlerRef.current('expand');
    }
  }, []);

  // Collapse all branches
  const handleCollapseAll = useCallback(() => {
    if (expandCollapseHandlerRef.current) {
      expandCollapseHandlerRef.current('collapse');
    }
  }, []);

  // Network view export handlers
  const handleNetworkExportSVG = useCallback(() => {
    if (!networkCanvasRef.current) return;
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${treeId}_${timestamp}.svg`;
    networkCanvasRef.current.exportSVG(filename, true);
  }, [treeId]);

  const handleNetworkExportPNG = useCallback(async () => {
    if (!networkCanvasRef.current) return;
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${treeId}_${timestamp}.png`;
      await networkCanvasRef.current.exportPNG(filename, true);
    } finally {
      setIsExporting(false);
    }
  }, [treeId]);

  const handleNetworkExportPDF = useCallback(async () => {
    if (!networkCanvasRef.current) return;
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${treeId}_${timestamp}.pdf`;
      await networkCanvasRef.current.exportPDF(filename, true);
    } finally {
      setIsExporting(false);
    }
  }, [treeId]);

  // Persist layout orientation to localStorage
  useEffect(() => {
    localStorage.setItem('silsilah:networkLayoutOrientation', layoutOrientation);
  }, [layoutOrientation]);

  const fetchRenderData = useCallback(
    async (nextSelected?: string | null) => {
      setLoading(true);
      setError(null);

      try {
        const rawData = await getPublicRenderData(treeId);

        // Convert API DTO to view model through adapter boundary
        const viewModel = RenderDataAdapter.toTreeViewModel(rawData);
        setData(viewModel);
        
        // Build hierarchy model through adapter (ONLY place hierarchy is built)
        const hierarchyModel = RenderDataAdapter.buildHierarchyModel(rawData, {
          rootPersonId: nextSelected ?? undefined,
        });
        setHierarchy(hierarchyModel);

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
    undoRedo.clear(); // Clear undo/redo stack when tree changes
  }, [fetchRenderData, treeId]);

  // Register user presence when tree loads
  useEffect(() => {
    const registerPresence = async () => {
      try {
        await collaboration.registerUserPresence(treeId);
        addToast(`Now viewing tree as ${collaboration.currentUsername}`, 'info');
      } catch (error) {
        console.error('Failed to register presence:', error);
      }
    };

    if (treeId) {
      registerPresence();
    }

    return () => {
      if (treeId) {
        collaboration.unregisterUserPresence(treeId).catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeId]);

  // Monitor edit drawer and check for conflicts/locks
  useEffect(() => {
    if (!editDrawerOpen || !selectedPersonId) return;

    const checkAndLock = async () => {
      try {
        // Check for conflicts
        const conflict = await collaboration.checkConflict(treeId, selectedPersonId);
        if (conflict) {
          addToast(`Warning: ${conflict.conflictingUsername} is editing this person!`, 'warning');
          setShowConflictModal(true);
        }

        // Try to acquire lock
        const locked = await collaboration.lockPerson(treeId, selectedPersonId);
        if (!locked) {
          addToast('Could not acquire lock - another user may be editing', 'warning');
        }
      } catch (error) {
        console.error('Failed to check conflict or lock:', error);
      }
    };

    checkAndLock();

    return () => {
      // Release lock when drawer closes
      collaboration.unlockPerson(treeId, selectedPersonId).catch(console.error);
    };
  }, [editDrawerOpen, selectedPersonId, treeId, collaboration, addToast]);

  // Calculate statistics from tree data
  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      setStatistics(null);
      return;
    }

    const calculateStats = async () => {
      setStatisticsLoading(true);
      try {
        // Build person stats map from nodes
        // In a real app, you'd fetch more detailed person information from the API
        const personStatsMap = new Map<string, PersonStats>();
        data.nodes.forEach(node => {
          personStatsMap.set(node.id, {
            id: node.id,
            displayName: node.displayName,
            gender: 'UNKNOWN',
            // Note: birthDate, deathDate would come from additional API calls in production
          });
        });

        const stats = calculateTreeStatistics(data, personStatsMap);
        setStatistics(stats);
      } catch (error) {
        console.error('Failed to calculate statistics:', error);
        setStatistics(null);
      } finally {
        setStatisticsLoading(false);
      }
    };

    calculateStats();
  }, [data]);

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
  const directRelativeIds = useMemo(() => {
    const set = new Set<string>();
    if (selectedPersonId) set.add(selectedPersonId);
    parents.forEach((p) => set.add(p.personId));
    children.forEach((c) => set.add(c.personId));
    spouses.forEach((s) => set.add(s.personId));
    return set;
  }, [selectedPersonId, parents, children, spouses]);

  const handleEdgeClick = useCallback((edge: RenderEdgeData) => {
    setSelectedEdge(edge);
    setEdgeEditorOpen(true);
  }, []);

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
    // HierarchicalTreeCanvas currently does not implement export; no-op
  }, [treeId]);

  const handleExportPNG = useCallback(() => {
    const timestamp = new Date().toISOString().slice(0, 10);
    // HierarchicalTreeCanvas currently does not implement export; no-op
  }, [treeId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (undoRedo.canUndo) {
          undoRedo.undo();
          addToast('Action undone', 'info');
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        if (undoRedo.canRedo) {
          undoRedo.redo();
          addToast('Action redone', 'info');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undoRedo, addToast]);

  return (
    <div className="d-flex flex-column" style={{ height: 'calc(100vh - 74px)' }}>
      <Toolbar
        treeId={treeId}
        onAddPerson={() => setAddDrawerOpen(true)}
        onAddRelationship={() => {
          setRelationshipManagerOpen(true);
        }}
        viewMode={viewMode}
        onChangeView={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomReset={handleZoomReset}
        showZoomControls={viewMode !== 'network' && viewMode !== 'timeline'}
        onExportSVG={viewMode === 'network' ? handleNetworkExportSVG : handleExportSVG}
        onExportPNG={viewMode === 'network' ? handleNetworkExportPNG : handleExportPNG}
        onExportPDF={viewMode === 'network' ? handleNetworkExportPDF : undefined}
        currentDetailLevel={currentDetailLevel}
        workerMode={workerModeOverride}
        onWorkerModeChange={setWorkerModeOverride}
        layoutOrientation={layoutOrientation}
        onLayoutChange={setLayoutOrientation}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        isExporting={isExporting}
        canUndo={undoRedo.canUndo}
        canRedo={undoRedo.canRedo}
        onUndo={() => {
          undoRedo.undo();
          addToast('Action undone', 'info');
        }}
        onRedo={() => {
          undoRedo.redo();
          addToast('Action redone', 'info');
        }}
      />

      {/* Presence indicators bar */}
      {collaboration.activeUsers.length > 0 && (
        <PresenceBar
          activeUsers={collaboration.activeUsers}
          currentUserId={collaboration.currentUserId}
          maxVisible={4}
        />
      )}

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
                  ref={networkCanvasRef}
                  data={data}
                  selectedPersonId={selectedPersonId}
                  relatedEdgeIds={relatedEdgeIds}
                  onNodeClick={setSelectedPersonId}
                  onEdgeClick={handleEdgeClick}
                  directRelativeIds={directRelativeIds}
                  layoutOrientation={layoutOrientation}
                  onExpandCollapseAll={handleExpandCollapseAll}
                  treeName={treeId}
                  onEdit={(personId) => {
                    setSelectedPersonId(personId);
                    setEditDrawerOpen(true);
                  }}
                  onAddRelative={() => {
                    if (selectedPersonId) {
                      setRelationshipManagerOpen(true);
                    }
                  }}
                  onToggleCollapse={() => {
                    // Collapse toggle is handled within TreeCanvas
                  }}
                />
              ) : viewMode === 'timeline' ? (
                <TimelineView
                  data={data}
                  selectedPersonId={selectedPersonId}
                  onNodeClick={setSelectedPersonId}
                  relatedEdgeIds={relatedEdgeIds}
                  directRelativeIds={directRelativeIds}
                />
              ) : (
                hierarchy && (
                  <HierarchicalTreeCanvas
                    hierarchy={hierarchy}
                    orientation={viewMode === 'tree-vertical' ? 'vertical' : 'horizontal'}
                    selectedPersonId={selectedPersonId}
                    onSelectPerson={setSelectedPersonId}
                    layout={{ showSpouseEdges: true }}
                  />
                )
              )}
            </div>
            <div className="col-3 h-100 p-3 bg-light border-start overflow-auto">
              <div className="d-flex flex-column gap-2" style={{ height: '100%' }}>
                {/* Sidebar tabs for Statistics, Help, and Activity */}
                <ul className="nav nav-tabs nav-fill" role="tablist" style={{ fontSize: '0.85rem' }}>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${showStatistics ? 'active' : ''}`}
                      onClick={() => setShowStatistics(true)}
                      role="tab"
                      aria-selected={showStatistics}
                    >
                      📊 Stats
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${!showStatistics ? 'active' : ''}`}
                      onClick={() => setShowStatistics(false)}
                      role="tab"
                      aria-selected={!showStatistics}
                    >
                      ℹ️ Help
                    </button>
                  </li>
                </ul>

                {/* Statistics Panel */}
                {showStatistics ? (
                  <div className="flex-grow-1 overflow-auto">
                    <StatisticsSidebar
                      statistics={statistics}
                      treeName={treeId}
                      isLoading={statisticsLoading}
                    />
                  </div>
                ) : (
                  <div className="flex-grow-1 overflow-auto">
                    <div className="d-flex flex-column gap-3" style={{ height: '100%' }}>
                      {/* Activity Feed */}
                      <div style={{ flex: '0 1 40%', overflowY: 'auto' }}>
                        <ActivityFeed
                          activities={collaboration.activities}
                          hasMore={collaboration.hasMoreActivities}
                          isLoading={isActivityLoading}
                          onLoadMore={async () => {
                            setIsActivityLoading(true);
                            try {
                              await collaboration.loadMoreActivities();
                            } finally {
                              setIsActivityLoading(false);
                            }
                          }}
                        />
                      </div>
                      
                      {/* Help Sidebar */}
                      <div style={{ flex: '0 1 60%', overflowY: 'auto' }}>
                        <HelpSidebar />
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
        onAddRelationship={() => {
          setRelationshipManagerOpen(true);
        }}
        onEdit={(pid) => setEditDrawerOpen(true)}
        onChildAdded={(childId) => {
          // Child added successfully, select the child to show it
          setSelectedPersonId(childId);
        }}
        onRefresh={() => {
          // Refresh the tree visualization after child is added
          if (selectedPersonId) {
            fetchRenderData(selectedPersonId);
          }
        }}
      />

      <AddPersonDrawer
        treeId={treeId}
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        onCreated={(personId) => {
          // Record undo action for add person
          undoRedo.recordAction({
            type: 'add-person',
            description: 'Add person',
            timestamp: Date.now(),
            data: { personId, treeId },
            inverseData: { personId, treeId },
            execute: async () => {
              // Execute is the default action (person already added)
              await fetchRenderData(personId);
            },
            inverse: async (data: Record<string, any>) => {
              // Delete the person to undo
              const { deletePerson } = await import('../api');
              await deletePerson(data.treeId, data.personId);
              await fetchRenderData(null);
            },
          });
          fetchRenderData(personId);
        }}
      />

      {selectedPersonId && (
        <RelationshipManager
          treeId={treeId}
          open={relationshipManagerOpen}
          onClose={() => setRelationshipManagerOpen(false)}
          nodes={data?.nodes || []}
          currentPersonId={selectedPersonId}
          onCreated={(focusId) => {
            // Record undo action for add relationship
            undoRedo.recordAction({
              type: 'add-relationship',
              description: 'Add relationship',
              timestamp: Date.now(),
              data: { focusId, treeId },
              inverseData: { focusId, treeId },
              execute: async () => {
                await fetchRenderData(focusId);
              },
              inverse: async (data: Record<string, any>) => {
                // For undo, reload without the new relationship
                await fetchRenderData(data.focusId);
              },
            });
            fetchRenderData(focusId);
          }}
          currentParents={parents}
          currentChildren={children}
          currentSpouses={spouses}
          edges={data?.edges || []}
          onCreateSpouse={async (tid, payload) => {
            const { establishSpouseRelationship } = await import('../api');
            return establishSpouseRelationship(tid, payload);
          }}
        />
      )}
      <RelationshipEditDrawer
        open={edgeEditorOpen}
        edge={selectedEdge}
        onClose={() => setEdgeEditorOpen(false)}
        onDelete={async (edge) => {
          // Record undo action for delete relationship
          undoRedo.recordAction({
            type: 'delete-relationship',
            description: 'Delete relationship',
            timestamp: Date.now(),
            data: { edgeId: edge.id, treeId },
            inverseData: { edgeId: edge.id, treeId },
            execute: async () => {
              setEdgeEditorOpen(false);
              setSelectedEdge(null);
              await fetchRenderData(selectedPersonId);
            },
            inverse: async (data: Record<string, any>) => {
              // For undo, reload the relationship
              await fetchRenderData(selectedPersonId);
            },
          });
          setEdgeEditorOpen(false);
          setSelectedEdge(null);
          await fetchRenderData(selectedPersonId);
        }}
      />

      <EditPersonDrawer
        treeId={treeId}
        personId={selectedPersonId}
        onClose={() => setEditDrawerOpen(false)}
        onSuccess={async () => {
          // Record undo action for edit person
          undoRedo.recordAction({
            type: 'edit-person',
            description: 'Edit person',
            timestamp: Date.now(),
            data: { personId: selectedPersonId, treeId },
            inverseData: { personId: selectedPersonId, treeId },
            execute: async (data: Record<string, any>) => {
              await fetchRenderData(data.personId);
            },
            inverse: async (data: Record<string, any>) => {
              // For undo, we need to reload previous version
              // This is a simplified version - ideally we'd store the previous state
              await fetchRenderData(data.personId);
            },
          });
          await fetchRenderData(selectedPersonId);
        }}
        onDeleted={async () => {
          const deletedPersonId = selectedPersonId;
          // Record undo action for delete person
          undoRedo.recordAction({
            type: 'delete-person',
            description: 'Delete person',
            timestamp: Date.now(),
            data: { personId: deletedPersonId, treeId },
            inverseData: { personId: deletedPersonId, treeId },
            execute: async () => {
              setSelectedPersonId(null);
              await fetchRenderData(null);
            },
            inverse: async (data: Record<string, any>) => {
              // Undo delete would require storing the person data first
              await fetchRenderData(null);
            },
          });
          setSelectedPersonId(null);
          await fetchRenderData(null);
        }}
        parents={parents}
        children={children}
        spouses={spouses}
        edges={data?.edges || []}
      />

      {/* Edit Conflict Modal */}
      {collaboration.activeConflicts.length > 0 && (
        <EditConflictModal
          conflict={collaboration.activeConflicts[0]}
          isOpen={showConflictModal}
          onResolve={(resolution) => {
            collaboration.resolveConflict(collaboration.activeConflicts[0].personId, resolution);
            setShowConflictModal(false);
            addToast(`Conflict resolved: ${resolution}`, 'success');
          }}
          onClose={() => setShowConflictModal(false)}
        />
      )}
    </div>
  );
}
