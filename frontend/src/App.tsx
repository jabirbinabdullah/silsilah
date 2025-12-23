import { Routes, Route, Link } from 'react-router-dom';
import { TreeList } from './components/TreeList';
import { TreeViewer } from './components/TreeViewer';

export function App() {
  return (
    <div style={{ padding: '16px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>Silsilah</h1>
        </Link>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>Read-only Milestone • Tree List + Viewer</span>
      </header>

      <Routes>
        <Route path="/" element={<TreeList />} />
        <Route path="/trees/:treeId" element={<TreeViewer />} />
      </Routes>
    </div>
  );
}
