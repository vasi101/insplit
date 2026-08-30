import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: '260px',
          padding: '32px 36px 60px',
          maxWidth: '1600px',
          width: 'calc(100% - 260px)',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
