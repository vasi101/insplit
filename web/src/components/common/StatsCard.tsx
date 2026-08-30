import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  accentColor?: string;
  onClick?: () => void;
}

export function StatsCard({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  icon: Icon,
  accentColor = '#4361EE',
  onClick,
}: StatsCardProps) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Background glow circle */}
      <div
        style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: accentColor,
          opacity: 0.12,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
          {title}
        </span>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: `${accentColor}18`,
            border: `1px solid ${accentColor}35`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accentColor,
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {value}
        </h2>
        {change && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              fontSize: '12px',
              fontWeight: 700,
              color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            }}
          >
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
