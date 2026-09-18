import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="admin-shell">
      <button
        className="admin-menu-button btn btn-secondary btn-icon"
        type="button"
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <Sidebar isOpen={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && <button className="admin-sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
