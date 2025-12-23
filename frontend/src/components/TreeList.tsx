import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrees, setApiConfig, type TreeListItem } from '../api';

function InputRow({
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
    <label className="flex gap-3 items-center">
      <span className="w-32 text-gray-700 text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

export function TreeList() {
  const [apiBaseUrl, setApiBaseUrl] = useState<string>(
    () => localStorage.getItem('apiBaseUrl') || 'http://localhost:3000'
  );
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('authToken') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trees, setTrees] = useState<TreeListItem[]>([]);

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
      const data = await getTrees();
      setTrees(data.trees || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Your Trees</h2>

      {/* Settings Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Backend Settings</h3>
        <InputRow label="API Base URL" value={apiBaseUrl} onChange={setApiBaseUrl} placeholder="http://localhost:3000" />
        <InputRow label="Auth Token" value={authToken} onChange={setAuthToken} placeholder="(optional JWT)" />
        <div className="pt-2">
          <button
            onClick={fetchTrees}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Load Trees
          </button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      {/* Trees List */}
      {loading ? (
        <div className="text-gray-600">Loading trees…</div>
      ) : trees.length === 0 ? (
        <div className="text-gray-500">No trees found.</div>
      ) : (
        <div className="space-y-3">
          {trees.map((t) => (
            <div
              key={t.treeId}
              className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors"
            >
              <div>
                <h4 className="font-semibold text-gray-900">{t.name || t.treeId}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Role: <span className="font-medium">{t.role}</span> · Persons: <span className="font-medium">{t.personCount}</span>
                </p>
              </div>
              <Link to={`/trees/${encodeURIComponent(t.treeId)}`}>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  Open
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-500 pt-4">
        Note: Viewer uses public read-only endpoint. No authentication needed to view family trees.
      </div>
    </div>
  );
}
