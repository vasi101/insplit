import React from 'react';

interface BadgeProps {
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'default';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function Badge({ variant = 'default', children, icon }: BadgeProps) {
  const getStyle = () => {
    switch (variant) {
      case 'emerald':
        return { background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'amber':
        return { background: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'rose':
        return { background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)' };
      case 'indigo':
        return { background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' };
      case 'cyan':
        return { background: 'rgba(76, 201, 240, 0.15)', color: '#7dd3fc', border: '1px solid rgba(76, 201, 240, 0.3)' };
      default:
        return { background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' };
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: 'var(--radius-full)',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        ...getStyle(),
      }}
    >
      {icon}
      {children}
    </span>
  );
}
