import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrees, setApiConfig, type TreeListItem } from '../api';

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
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(
    () => localStorage.getItem('apiBaseUrl') || 'http://localhost:3000'
  );
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('authToken') || '');
  const [directTreeId, setDirectTreeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<TreeListItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                <div className={`collapse mt-3 ${isSettingsOpen ? 'show' : ''}`} id="settings-collapse">
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
                    className="btn btn-secondary"
                  >
                    {loading ? 'Loading...' : 'Load Tree List'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Available Trees</h4>
        {error && <div className="alert alert-danger mb-0 py-2 px-3">{error}</div>}
      </div>

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
            <div className="card h-100 shadow-sm hover-shadow">
              <div className="card-body">
                <h5 className="card-title">{t.name || t.treeId}</h5>
                <p className="card-text text-muted">
                  Contains {t.personCount} person(s). Your role is{' '}
                  <span className="badge bg-secondary">{t.role}</span>.
                </p>
              </div>
              <div className="card-footer bg-transparent border-0 pb-3">
                <Link
                  to={`/trees/${encodeURIComponent(t.treeId)}`}
                  className="btn btn-primary w-100"
                >
                  Open Tree
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
