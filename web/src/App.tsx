import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Showcase } from './pages/Showcase';

// Public visitors do not download the operations dashboard and charting code.
const AdminApp = lazy(() => import('./AdminApp'));

export function App() {
  return <Routes>
    <Route path="/" element={<Showcase />} />
    <Route path="/ad/*" element={<Suspense fallback={<div role="status" style={{ padding: 40 }}>Loading dashboard…</div>}><AdminApp /></Suspense>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
export default App;
