import React, { useEffect, useState } from 'react';
import {
  Users,
  Receipt,
  Home,
  Boxes,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Header } from '../components/layout/Header';
import { StatsCard } from '../components/common/StatsCard';
import { Badge } from '../components/common/Badge';
import { fetchDashboardStats } from '../services/api';
import { DashboardStats } from '../types';
import { subscribeSocketEvent } from '../services/socket';

const CATEGORY_COLORS: Record<string, string> = {
  GROCERY: '#4361EE',
  UTILITIES: '#4CC9F0',
  RENT: '#7209B7',
  CLEANING: '#10B981',
  FOOD: '#F59E0B',
  TRANSPORT: '#F43F5E',
  MEDICAL: '#EC4899',
  ENTERTAINMENT: '#8B5CF6',
  OTHER: '#64748B',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // Auto-refresh stats when any activity occurs on the server in real-time
    const unsubTxCreated = subscribeSocketEvent('transaction:created', () => loadStats(false));
    const unsubTxApproved = subscribeSocketEvent('transaction:approved', () => loadStats(false));
    const unsubTxUpdated = subscribeSocketEvent('transaction:updated', () => loadStats(false));
    const unsubTxDeleted = subscribeSocketEvent('transaction:deleted', () => loadStats(false));
    const unsubUserCreated = subscribeSocketEvent('user:created', () => loadStats(false));
    const unsubUserUpdated = subscribeSocketEvent('user:updated', () => loadStats(false));
    const unsubInvCreated = subscribeSocketEvent('inventory:created', () => loadStats(false));
    const unsubInvUpdated = subscribeSocketEvent('inventory:updated', () => loadStats(false));
    const unsubRoomCreated = subscribeSocketEvent('room:created', () => loadStats(false));
    const unsubRoomDeleted = subscribeSocketEvent('room:deleted', () => loadStats(false));

    return () => {
      unsubTxCreated();
      unsubTxApproved();
      unsubTxUpdated();
      unsubTxDeleted();
      unsubUserCreated();
      unsubUserUpdated();
      unsubInvCreated();
      unsubInvUpdated();
      unsubRoomCreated();
      unsubRoomDeleted();
    };
  }, []);

  const formatCurrency = (val: number) => `NPR ${val.toLocaleString()}`;

  // Prepare chart data for monthly volume
  const monthlyChartData = stats?.monthlyTrends.transactions.map((t) => ({
    name: `${MONTH_NAMES[t.month - 1]} ${t.year}`,
    volume: t.volume,
    count: t.count,
  })) || [];

  // Prepare chart data for user registrations
  const userChartData = stats?.monthlyTrends.users.map((u) => ({
    name: `${MONTH_NAMES[u.month - 1]} ${u.year}`,
    signups: u.count,
  })) || [];

  // Category donut data
  const categoryData = stats?.categoryBreakdown.map((c) => ({
    name: c.category,
    value: c.totalAmount,
    count: c.count,
    color: CATEGORY_COLORS[c.category] || '#64748B',
  })) || [];

  return (
    <div>
      <Header
        title="Executive Overview"
        subtitle="Global platform health, transaction volumes, user acquisition, and room metrics."
        onRefresh={loadStats}
        isRefreshing={isLoading}
      />

      {error && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fda4af',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <StatsCard
          title="TOTAL REGISTERED USERS"
          value={stats?.overview.totalUsers ?? '...'}
          subtitle={`${stats?.overview.verifiedUsers ?? 0} email verified`}
          change={stats?.overview.newUsers30d ? `+${stats.overview.newUsers30d} last 30d` : undefined}
          isPositive={true}
          icon={Users}
          accentColor="var(--accent-primary)"
        />

        <StatsCard
          title="TOTAL EXPENSE VOLUME"
          value={stats ? formatCurrency(stats.overview.totalVolumeNPR) : '...'}
          subtitle={`${stats?.overview.totalTransactions ?? 0} transactions processed`}
          change="All Time"
          isPositive={true}
          icon={TrendingUp}
          accentColor="var(--accent-cyan)"
        />

        <StatsCard
          title="ACTIVE FLATS & ROOMS"
          value={stats?.overview.totalRooms ?? '...'}
          subtitle={`${stats?.overview.newRooms30d ?? 0} created recently`}
          isPositive={true}
          icon={Home}
          accentColor="var(--accent-secondary)"
        />

        <StatsCard
          title="INVENTORY ITEMS"
          value={stats?.overview.totalInventory ?? '...'}
          subtitle={
            stats?.overview.lowStockItems && stats.overview.lowStockItems > 0
              ? `⚠️ ${stats.overview.lowStockItems} low stock items`
              : 'All stocks healthy'
          }
          isPositive={stats?.overview.lowStockItems === 0}
          icon={Boxes}
          accentColor={stats?.overview.lowStockItems ? 'var(--accent-amber)' : 'var(--accent-emerald)'}
        />
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '24px',
          marginBottom: '28px',
        }}
      >
        {/* Transaction Volume Trends */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Expense Volume & Trends
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Monthly spending volume in NPR
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Badge variant="indigo">Verified & Pending</Badge>
            </div>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            {monthlyChartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No transaction trend history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4361EE" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#4361EE" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(val) => `Rs ${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d1226',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#4361EE" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* User Acquisition Bar Chart */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                User Growth & Registrations
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                New accounts created per month
              </p>
            </div>
            <Badge variant="cyan">Monthly Signups</Badge>
          </div>

          <div style={{ height: '260px', width: '100%' }}>
            {userChartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No user growth history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0d1226',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="signups" fill="#4CC9F0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Spending by Category
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Distribution of expense volume across categories
              </p>
            </div>
          </div>

          <div style={{ height: '260px', width: '100%', display: 'flex', alignItems: 'center' }}>
            {categoryData.length === 0 ? (
              <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No category data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#070913" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatCurrency(Number(val))}
                    contentStyle={{
                      backgroundColor: '#0d1226',
                      borderColor: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Latest Transactions */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Latest Transactions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.recent.transactions.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No transactions recorded yet.</div>
            ) : (
              stats?.recent.transactions.map((tx) => (
                <div
                  key={tx._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: `${CATEGORY_COLORS[tx.category] || '#4361EE'}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: CATEGORY_COLORS[tx.category] || '#4361EE',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {tx.category[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tx.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        By {(tx.createdBy as any)?.name || 'Unknown'} • {new Date(tx.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      NPR {tx.amount.toLocaleString()}
                    </div>
                    <Badge
                      variant={
                        tx.status === 'VERIFIED'
                          ? 'emerald'
                          : tx.status === 'PENDING'
                          ? 'amber'
                          : 'rose'
                      }
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest Users */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Recently Joined Users
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats?.recent.users.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No users registered yet.</div>
            ) : (
              stats?.recent.users.map((u) => (
                <div
                  key={u._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {u.name ? u.name[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {u.isAdmin && <Badge variant="indigo">Admin</Badge>}
                    <Badge variant={u.emailVerified ? 'emerald' : 'amber'}>
                      {u.emailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
