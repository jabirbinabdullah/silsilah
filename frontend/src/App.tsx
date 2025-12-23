import { Routes, Route, Link } from 'react-router-dom';
import { TreeList } from './components/TreeList';
import { TreeViewer } from './components/TreeViewer';

export function App() {
  return (
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <h1 className="text-2xl font-bold text-gray-900">Silsilah</h1>
          <span className="text-sm text-gray-500">Genealogy • Read-only</span>
        </Link>
      </header>

      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<TreeList />} />
          <Route path="/trees/:treeId" element={<TreeViewer />} />
        </Routes>
      </div>
    </div>
  );
}
