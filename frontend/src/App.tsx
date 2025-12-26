import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TreeList } from './components/TreeList';
import { TreeViewer } from './components/TreeViewer';

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TreeList />} />
        <Route path="/trees/:treeId" element={<TreeViewer />} />
      </Routes>
    </Layout>
  );
}
