import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getTrees, setApiConfig, exportTree, type TreeListItem } from '../api';
import CreateTreeModal from './CreateTreeModal';
import TreeCardMenu from './TreeCardMenu';
import RenameTreeModal from './RenameTreeModal';
import ChangeDescriptionModal from './ChangeDescriptionModal';
import DeleteTreeModal from './DeleteTreeModal';
import ExportModal from './ExportModal';
import ImportModal from './ImportModal';

function SettingsInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="row align-items-center mb-3">
      <div className="col-sm-3">
        <label className="form-label mb-0">{label}</label>
      </div>
      <div className="col-sm-9">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="form-control"
        />
      </div>
    </div>
  );
}

export function TreeList() {
  const navigate = useNavigate();
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(
    () => localStorage.getItem('apiBaseUrl') || 'http://localhost:3000'
  );
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('authToken') || '');
  const [directTreeId, setDirectTreeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<TreeListItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Tree action modals
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedTree, setSelectedTree] = useState<TreeListItem | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const canFetch = useMemo(() => !!apiBaseUrl, [apiBaseUrl]);

  useEffect(() => {
    if (!canFetch) return;
    void fetchTrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTrees() {
    setError(null);
    setLoading(true);
    try {
      setApiConfig(apiBaseUrl, authToken);
      localStorage.setItem('apiBaseUrl', apiBaseUrl);
      localStorage.setItem('authToken', authToken);
      const data = await getTrees();
      setTrees(data.trees || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  const handleTreeCreated = (treeId: string) => {
    setIsCreateModalOpen(false);
    // Refresh tree list
    void fetchTrees();
    // Navigate to new tree
    navigate(`/trees/${encodeURIComponent(treeId)}`);
  };

  const openRenameModal = (tree: TreeListItem) => {
    setSelectedTree(tree);
    setRenameModalOpen(true);
  };

  const openDescriptionModal = (tree: TreeListItem) => {
    setSelectedTree(tree);
    setDescriptionModalOpen(true);
  };

  const openDeleteModal = (tree: TreeListItem) => {
    setSelectedTree(tree);
    setDeleteModalOpen(true);
  };

  const handleExportTree = async (tree: TreeListItem, format: 'json-full' | 'json-minimal' | 'gedcom') => {
    setExportError(null);
    try {
      const blob = await exportTree(tree.treeId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tree.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.${format === 'gedcom' ? 'ged' : 'json'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Failed to export tree');
    }
  };

  const handleRenameSuccess = (newName: string) => {
    if (selectedTree) {
      setTrees(trees.map((t) => (t.treeId === selectedTree.treeId ? { ...t, name: newName } : t)));
    }
  };

  const handleDescriptionSuccess = (newDescription: string) => {
    if (selectedTree) {
      setTrees(trees.map((t) => (t.treeId === selectedTree.treeId ? { ...t, description: newDescription } : t)));
    }
  };

  const handleDeleteSuccess = () => {
    void fetchTrees();
  };

  const normalizedDirectTreeId = useMemo(() => {
    const trimmed = directTreeId.trim();
    if (!trimmed) return '';
    try {
      const u = new URL(trimmed);
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'trees');
      if (idx !== -1 && parts[idx + 1]) return decodeURIComponent(parts[idx + 1]);
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      const segments = trimmed.split('/').filter(Boolean);
      return decodeURIComponent(segments[segments.length - 1]);
    }
  }, [directTreeId]);

  return (
    <div className="container py-4">
      <div className="p-5 mb-4 bg-light rounded-3 shadow-sm">
        <div className="container-fluid py-3">
          <h1 className="display-5 fw-bold">Dashboard</h1>
          <p className="col-md-8 fs-4">
            Welcome to Silsilah. Open an existing family tree or connect to your backend to load a
            list of trees.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-12">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
              <h5 className="card-title mb-0">Actions</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="treeIdInput" className="form-label">
                  Open Tree by ID or URL
                </label>
                <div className="input-group">
                  <input
                    id="treeIdInput"
                    value={directTreeId}
                    onChange={(e) => setDirectTreeId(e.target.value)}
                    placeholder="Enter a known Tree ID or paste a full URL"
                    className="form-control"
                  />
                  <Link to={normalizedDirectTreeId ? `/trees/${normalizedDirectTreeId}` : '#'}>
                    <button
                      disabled={!normalizedDirectTreeId}
                      className="btn btn-primary"
                      type="button"
                    >
                      Open
                    </button>
                  </Link>
                </div>
              </div>
              <hr />
              <div className="mt-3">
                <button
                  className="btn btn-link text-decoration-none p-0"
                  type="button"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <h6 className="mb-0">
                    Backend Settings <small>(click to expand)</small>
                  </h6>
                </button>
                {isSettingsOpen && (
                  <div className="card card-body bg-light mt-3">
                    <SettingsInput
                      label="API Base URL"
                      value={apiBaseUrl}
                      onChange={setApiBaseUrl}
                      placeholder="http://localhost:3000"
                    />
                    <SettingsInput
                      label="Auth Token"
                      value={authToken}
                      onChange={setAuthToken}
                      placeholder="(optional JWT)"
                    />
                    <button
                      onClick={fetchTrees}
                      disabled={loading || !canFetch}
                      className="btn btn-secondary mt-2"
                    >
                      {loading ? 'Loading...' : 'Load Tree List'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Available Trees</h4>
        {error && <div className="alert alert-danger mb-0 py-2 px-3">{error}</div>}
      </div>

      {exportError && (
        <div className="alert alert-warning mb-3" role="alert">
          {exportError}
        </div>
      )}

      {loading && <div className="text-center text-muted">Loading trees…</div>}

      {!loading && trees.length === 0 && (
        <div className="text-center py-5 bg-light rounded-3">
          <h5 className="text-muted">No trees found.</h5>
          <p className="text-muted">
            Use the "Backend Settings" above to connect to your backend and load a list.
          </p>
        </div>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {trees.map((t) => (
          <div key={t.treeId} className="col">
            <div className="card h-100 shadow-sm hover-shadow" style={{ position: 'relative' }}>
              {/* Menu Button */}
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 10 }}>
                <TreeCardMenu
                  tree={t}
                  onRename={() => openRenameModal(t)}
                  onChangeDescription={() => openDescriptionModal(t)}
                  onExport={(format) => {
                    setSelectedTree(t);
                    // For newer formats, use the export modal
                    if (format.startsWith('json')) {
                      setExportModalOpen(true);
                    } else {
                      handleExportTree(t, format as any);
                    }
                  }}
                  onDelete={() => openDeleteModal(t)}
                  onImport={() => {
                    setSelectedTree(t);
                    setImportModalOpen(true);
                  }}
                />
              </div>

              <div className="card-body">
                <h5 className="card-title pr-8">{t.name || t.treeId}</h5>
                {t.description && (
                  <p className="card-text text-muted small mb-3">{t.description}</p>
                )}

                {/* Statistics */}
                <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <small className="text-muted">Persons</small>
                    <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>
                      {t.personCount}
                    </p>
                  </div>
                  {t.relationshipCount !== undefined && (
                    <div>
                      <small className="text-muted">Relationships</small>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>
                        {t.relationshipCount}
                      </p>
                    </div>
                  )}
                </div>

                {/* Last Modified */}
                <small className="text-muted">
                  Updated{' '}
                  {new Date(t.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year:
                      new Date(t.updatedAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                  })}
                </small>

                {/* Role Badge */}
                <div className="mt-2">
                  <span
                    className={`badge ${
                      t.role === 'OWNER'
                        ? 'bg-primary'
                        : t.role === 'EDITOR'
                        ? 'bg-info'
                        : 'bg-secondary'
                    }`}
                  >
                    {t.role}
                  </span>
                </div>
              </div>
              <div className="card-footer bg-transparent border-0 pb-3">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <Link
                    to={`/trees/${encodeURIComponent(t.treeId)}`}
                    className="btn btn-primary btn-sm"
                  >
                    Open
                  </Link>
                  <Link
                    to={`/trees/${encodeURIComponent(t.treeId)}/settings`}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-2xl font-bold transition hover:shadow-xl"
        title="Create new tree"
        style={{
          bottom: '1.5rem',
          right: '1.5rem',
          width: '3.5rem',
          height: '3.5rem',
          backgroundColor: '#2563eb',
          cursor: 'pointer',
          border: 'none',
          zIndex: 40,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
      >
        +
      </button>

      {/* Modals */}
      <CreateTreeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTreeCreated}
      />

      {selectedTree && (
        <>
          <RenameTreeModal
            isOpen={renameModalOpen}
            treeName={selectedTree.name}
            treeId={selectedTree.treeId}
            onClose={() => {
              setRenameModalOpen(false);
              setSelectedTree(null);
            }}
            onSuccess={handleRenameSuccess}
          />

          <ChangeDescriptionModal
            isOpen={descriptionModalOpen}
            treeId={selectedTree.treeId}
            treeName={selectedTree.name}
            currentDescription={selectedTree.description}
            onClose={() => {
              setDescriptionModalOpen(false);
              setSelectedTree(null);
            }}
            onSuccess={handleDescriptionSuccess}
          />

          <DeleteTreeModal
            isOpen={deleteModalOpen}
            tree={selectedTree}
            onClose={() => {
              setDeleteModalOpen(false);
              setSelectedTree(null);
            }}
            onSuccess={handleDeleteSuccess}
          />

          <ExportModal
            isOpen={exportModalOpen}
            tree={selectedTree}
            onClose={() => {
              setExportModalOpen(false);
              setSelectedTree(null);
            }}
          />

          <ImportModal
            isOpen={importModalOpen}
            existingTrees={trees}
            onClose={() => {
              setImportModalOpen(false);
              setSelectedTree(null);
            }}
            onSuccess={(newTreeId) => {
              setImportModalOpen(false);
              setSelectedTree(null);
              void fetchTrees();
              navigate(`/trees/${encodeURIComponent(newTreeId)}`);
            }}
          />
        </>
      )}
    </div>
  );
}
