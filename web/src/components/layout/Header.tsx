import React, { useState } from 'react';
import { Bell, RefreshCw, Sparkles, Activity } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ title, subtitle, onRefresh, isRefreshing }: HeaderProps) {
  const [lastSynced, setLastSynced] = useState<Date>(new Date());

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
      setLastSynced(new Date());
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 9px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6ee7b7',
            }}
          >
            <span className="pulse-dot" />
            Live Sync
          </div>
        </div>
        {subtitle && (
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync Data</span>
          </button>
        )}

        <div
          className="glass-card"
          style={{
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <Activity size={14} color="var(--accent-cyan)" />
          <span>Server: <strong style={{ color: 'var(--accent-emerald)' }}>Connected</strong></span>
        </div>
      </div>
    </header>
  );
}
