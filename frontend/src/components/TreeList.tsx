import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrees, setApiConfig, type TreeListItem } from '../api';

function InputRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ width: 110, color: '#555' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, padding: '6px 8px', border: '1px solid #ccc', borderRadius: 6 }}
      />
    </label>
  );
}

export function TreeList() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(() => localStorage.getItem('apiBaseUrl') || 'http://localhost:3000');
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('authToken') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<TreeListItem[]>([]);

  const canFetch = useMemo(() => !!apiBaseUrl, [apiBaseUrl]);

  useEffect(() => {
    // Auto-load if config present
    if (!canFetch) return;
    void fetchTrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTrees() {
    setError(null);
    setLoading(true);
    try {
      setApiConfig(apiBaseUrl, authToken);
      const data = await getTrees();
      setTrees(data.trees || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h2 style={{ margin: 0 }}>Your Trees</h2>

      <div style={{ display: 'grid', gap: 8, background: '#fafafa', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <strong>Backend Settings</strong>
        <InputRow label="API Base URL" value={apiBaseUrl} onChange={setApiBaseUrl} placeholder="http://localhost:3000" />
        <InputRow label="Auth Token" value={authToken} onChange={setAuthToken} placeholder="(optional JWT)" />
        <div>
          <button onClick={fetchTrees} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>Load Trees</button>
        </div>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : trees.length === 0 ? (
        <div style={{ color: '#666' }}>No trees found.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {trees.map((t) => (
            <li key={t.treeId} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.name || t.treeId}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Role: {t.role} · Persons: {t.personCount}
                </div>
              </div>
              <Link to={`/trees/${encodeURIComponent(t.treeId)}`} style={{ textDecoration: 'none' }}>
                <button style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff' }}>Open</button>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div style={{ fontSize: 12, color: '#888' }}>Note: Viewer uses public read-only endpoint.</div>
    </div>
  );
}
