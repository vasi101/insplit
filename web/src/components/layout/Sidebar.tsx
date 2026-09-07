import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Receipt,
  Home,
  Boxes,
  ShieldCheck,
  LogOut,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
  const { user, logout } = useAuth();

  const links = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/analytics', label: 'Detailed Analytics', icon: BarChart3 },
    { to: '/users', label: 'User Directory', icon: Users },
    { to: '/transactions', label: 'Transactions & Audit', icon: Receipt },
    { to: '/rooms', label: 'Rooms & Flats', icon: Home },
    { to: '/inventory', label: 'Inventory Hub', icon: Boxes },
  ];

  return (
    <aside
      className="glass-panel"
      style={{
        width: '260px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        zIndex: 50,
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #4361EE, #7209B7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 15px rgba(67, 97, 238, 0.4)',
          }}
        >
          <Zap size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>Insplit</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                backgroundColor: 'rgba(67, 97, 238, 0.25)',
                color: 'var(--accent-primary)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(67, 97, 238, 0.4)',
              }}
            >
              ADMIN
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Management Platform</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
        <div style={{ padding: '0 8px 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
          Operations
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-primary-light)' : 'transparent',
                border: isActive ? '1px solid rgba(67, 97, 238, 0.4)' : '1px solid transparent',
                boxShadow: isActive ? '0 4px 14px rgba(67, 97, 238, 0.15)' : 'none',
                transition: 'all 0.2s ease',
              })}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'rgba(7, 9, 19, 0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                flexShrink: 0,
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} color="var(--accent-emerald)" />
                Superuser
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary btn-icon"
            title="Sign out"
            style={{ width: '32px', height: '32px', flexShrink: 0 }}
          >
            <LogOut size={15} color="var(--text-muted)" />
          </button>
        </div>
      </div>
    </aside>
  );
}
