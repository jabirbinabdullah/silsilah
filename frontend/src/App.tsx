import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { TreeList } from './components/TreeList';
import { TreeViewer } from './components/TreeViewer';
import TreeSettingsPage from './components/TreeSettingsPage';
import { ToastProvider } from './components/ToastNotification';
import { CollaborationProvider } from './context/CollaborationContext';

export function App() {
  return (
    <CollaborationProvider>
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<TreeList />} />
            <Route path="/trees/:treeId" element={<TreeViewer />} />
            <Route path="/trees/:treeId/settings" element={<TreeSettingsPage />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </CollaborationProvider>
  );
}
