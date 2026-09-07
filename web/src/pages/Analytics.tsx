import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData, MoneyRow, CountRow } from '../types/analytics';
import './Analytics.css';

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function presetRange(preset: string) {
  const end = new Date(); const start = new Date(end);
  if (preset === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (preset === 'month') start.setDate(1);
  if (preset === 'year') { start.setMonth(0, 1); }
  return { from: dateKey(start), to: dateKey(end) };
}
const initial = presetRange('month');
const categories = ['ALL', 'GROCERY', 'UTILITIES', 'RENT', 'CLEANING', 'FOOD', 'TRANSPORT', 'MEDICAL', 'ENTERTAINMENT', 'OTHER'];
function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return <div className="table-container"><table className="data-table"><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No records match these filters.</td></tr>}</tbody></table></div>;
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="glass-card analytics-panel"><h2>{title}</h2>{children}</section>; }
function Metrics({ values }: { values: [string, string | number][] }) { return <div className="analytics-metrics">{values.map(([label, value]) => <div className="glass-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>; }
function Trend({ rows, money = true }: { rows: (MoneyRow | CountRow)[]; money?: boolean }) {
  if (!rows.length) return <p className="analytics-note">No activity in this range.</p>;
  return <div style={{ width: '100%', height: 300 }}><ResponsiveContainer><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#344057" /><XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} /><Tooltip contentStyle={{ background: '#151c2f', borderColor: '#344057', color: '#fff' }} /><Legend />{money ? <><Bar dataKey="amount" name="All selected amounts" fill="#8ea2ff" /><Bar dataKey="verified" name="Verified amount" fill="#34d399" /></> : <Bar dataKey="count" name="Records" fill="#8ea2ff" />}</BarChart></ResponsiveContainer></div>;
}
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => { const raw = String(v); return `"${(/^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw).replace(/"/g, '""')}"`; };
  const url = URL.createObjectURL(new Blob(['\uFEFF' + [headers, ...rows].map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export function AnalyticsPage() {
  const [from, setFrom] = useState(initial.from); const [to, setTo] = useState(initial.to);
  const [roomId, setRoomId] = useState(''); const [group, setGroup] = useState('day');
  const [currency, setCurrency] = useState('NPR'); const [status, setStatus] = useState('ALL'); const [category, setCategory] = useState('ALL');
  const [tab, setTab] = useState('Transactions'); const [page, setPage] = useState(1); const [reload, setReload] = useState(0);
  const [data, setData] = useState<AnalyticsData | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [options, setOptions] = useState<Pick<AnalyticsData, 'roomOptions' | 'currencies'>>({ roomOptions: [], currencies: ['NPR'] });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const money = (value = 0) => `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 });
  useEffect(() => { setPage(1); }, [from, to, roomId, group, currency, status, category]);
  useEffect(() => {
    const abort = new AbortController();
    setData(null); setError('');
    if (!from || !to || from > to) { setError('Choose a start date on or before the end date.'); setLoading(false); return; }
    const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1);
    setLoading(true);
    fetchAnalytics({ from: new Date(`${from}T00:00:00`).toISOString(), to: end.toISOString(), roomId, group, currency, status, category, timezone, page }, abort.signal)
      .then(value => { if (!abort.signal.aborted) { setData(value); setOptions(value); } })
      .catch(err => { if (!abort.signal.aborted) setError(err.response?.data?.message || err.message || 'Could not load analytics.'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [from, to, roomId, group, currency, status, category, timezone, page, reload]);
  const txn = data?.transactions.summary[0]; const settlement = data?.settlements.summary[0];
  const count = (rows: CountRow[] = []) => rows.reduce((sum, row) => sum + row.count, 0);
  const moneyRows = (rows: MoneyRow[]) => rows.map(row => [row.name || row._id || 'Unknown', row.count, money(row.amount), money(row.verified), money(row.pending), money(row.average)]);
  const moneyHeaders = ['Name', 'Records', 'Selected amount', 'Verified', 'Pending', 'Average'];
  const roomRows = useMemo(() => data?.rooms.map(room => { const activity = data.transactions.rooms.find(row => row._id === room._id); return [room.name, room.activeMembers, room.pendingMembers, room.createdInPeriod ? 'Yes' : 'No', activity?.count ?? 0, money(activity?.verified)]; }) ?? [], [data, currency]);
  return <div className="analytics-page">
    <Header title="Detailed analytics" subtitle="Explore expenses, settlements, shared stock, rooms and users." onRefresh={() => setReload(v => v + 1)} isRefreshing={loading} />
    <div className="glass-card analytics-filters">
      <div className="analytics-presets">{[['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year']].map(([key, label]) => <button className="btn btn-secondary btn-sm" key={key} onClick={() => { const range = presetRange(key); setFrom(range.from); setTo(range.to); setGroup(key === 'year' ? 'month' : 'day'); }}>{label}</button>)}</div>
      <div className="analytics-filter-grid">
        <label>Room<select className="input-control" value={roomId} onChange={e => setRoomId(e.target.value)}><option value="">All rooms</option>{options.roomOptions.map(room => <option key={room._id} value={room._id}>{room.name}</option>)}</select></label>
        <label>From<input className="input-control" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>Through<input className="input-control" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label>Group by<select className="input-control" value={group} onChange={e => setGroup(e.target.value)}>{['day', 'week', 'month', 'year'].map(v => <option key={v} value={v}>{v[0].toUpperCase() + v.slice(1)}</option>)}</select></label>
        <label>Currency<select className="input-control" value={currency} onChange={e => setCurrency(e.target.value)}>{options.currencies.map(v => <option key={v}>{v}</option>)}</select></label>
      </div>
      <p className="analytics-note">Inclusive date range · {timezone} · Weeks run Monday–Sunday. Transactions use expense dates; settlements use payment dates; inventory and users use creation dates.</p>
    </div>
    <div className="analytics-tabs">{['Transactions', 'Settlements', 'Inventory', 'Rooms', 'Users'].map(value => <button key={value} className={`btn ${tab === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(value)}>{value}</button>)}</div>
    {(tab === 'Transactions' || tab === 'Rooms') && <div className="analytics-transaction-filters"><label>Transaction status<select className="input-control" value={status} onChange={e => setStatus(e.target.value)}>{['ALL', 'VERIFIED', 'PENDING', 'REJECTED', 'VOIDED'].map(v => <option key={v}>{v}</option>)}</select></label><label>Transaction category<select className="input-control" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(v => <option key={v}>{v}</option>)}</select></label></div>}
    {error && <div className="glass-card analytics-error" role="alert">{error} <button className="btn btn-secondary" onClick={() => setReload(v => v + 1)}>Retry</button></div>}
    {loading && <p role="status" className="analytics-note">Loading reports…</p>}
    {data && <>
      {tab === 'Transactions' && <>
        <Metrics values={[["Verified spending", money(txn?.verified)], ['Pending amount', money(txn?.pending)], ['Matching transactions', txn?.count ?? 0], ['Average selected expense', money(txn?.average)], ['Largest selected expense', money(txn?.largest)]]} />
        <p className="analytics-note">Verified spending excludes pending, rejected and voided entries. Selected amounts and averages include the statuses selected above.</p>
        <Panel title={`Expense trend (${currency})`}><Trend rows={data.transactions.trend} /><Table headers={['Period', 'Count', 'Selected amount', 'Verified amount']} rows={data.transactions.trend.map(row => [row._id, row.count, money(row.amount), money(row.verified)])} /></Panel>
        <div className="analytics-grid"><Panel title="Expense categories"><Table headers={moneyHeaders} rows={moneyRows(data.transactions.categories)} /></Panel><Panel title="Verification status"><Table headers={['Status', 'Count', 'Amount']} rows={data.transactions.statuses.map(row => [row._id, row.count, money(row.amount)])} /></Panel></div>
        <Panel title="Room comparison"><Table headers={moneyHeaders} rows={moneyRows(data.transactions.rooms)} /></Panel><Panel title="Who paid what"><Table headers={moneyHeaders} rows={moneyRows(data.transactions.people)} /></Panel>
        <Panel title="Transaction details"><button className="btn btn-secondary btn-sm" onClick={() => downloadCsv('transaction-summary.csv', moneyHeaders, moneyRows(data.transactions.rooms))}><Download size={14} /> Export room summary</button><Table headers={['Date', 'Title', 'Room', 'Paid by', 'Category', 'Status', 'Amount']} rows={data.transactions.details.map(row => [new Date(row.expenseDate).toLocaleDateString(), row.title, row.room || 'Deleted room', row.payer || 'Deleted user', row.category, row.status, money(row.amount)])} /><div className="analytics-pagination"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(v => v - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil((txn?.count ?? 0) / 25))} · {txn?.count ?? 0} records</span><button className="btn btn-secondary" disabled={page * 25 >= (txn?.count ?? 0)} onClick={() => setPage(v => v + 1)}>Next</button></div></Panel>
      </>}
      {tab === 'Settlements' && <><Metrics values={[["Verified payments", money(settlement?.verified)], ['Pending payments', money(settlement?.pending)], ['Payment records', settlement?.count ?? 0], ['Average payment', money(settlement?.average)]]} /><p className="analytics-note">Recorded payments in this period, not current outstanding debt. Transaction category and status filters do not apply here.</p><Panel title={`Settlement trend (${currency})`}><Trend rows={data.settlements.trend} /><Table headers={moneyHeaders} rows={moneyRows(data.settlements.trend)} /></Panel><Panel title="Payment methods"><Table headers={moneyHeaders} rows={moneyRows(data.settlements.methods)} /></Panel><Panel title="Settlement verification"><Table headers={['Status', 'Count', 'Amount']} rows={data.settlements.statuses.map(row => [row._id, row.count, money(row.amount)])} /></Panel><Panel title="Settlements by room"><Table headers={moneyHeaders} rows={moneyRows(data.settlements.rooms)} /></Panel></>}
      {tab === 'Inventory' && <><Metrics values={[["Delivery records", count(data.inventory.statuses)], ['Item / unit groups', data.inventory.items.length], ['Contributors', data.inventory.contributors.length], ['Pending reviews', data.inventory.statuses.find(row => row._id === 'PENDING')?.count ?? 0]]} /><p className="analytics-note">Active inventory entries created during this range. Quantities exclude rejected entries and include pending entries provisionally. Grams convert to kg; oil packets and liters stay separate. Currency and transaction filters do not apply.</p><Panel title="Delivery activity"><Trend rows={data.inventory.trend} money={false} /></Panel><Panel title="Stock contributions"><Table headers={['Item', 'Unit', 'Deliveries', 'Quantity brought', 'Pending reviews']} rows={data.inventory.items.map(row => [row._id.name, row._id.unit, row.count, number(row.quantity), row.pending])} /></Panel><div className="analytics-grid"><Panel title="Contributors"><Table headers={['Member', 'Delivery records']} rows={data.inventory.contributors.map(row => [row.name, row.count])} /></Panel><Panel title="Verification"><Table headers={['Status', 'Records']} rows={data.inventory.statuses.map(row => [row._id, row.count])} /></Panel></div></>}
      {tab === 'Rooms' && <><Metrics values={[["Rooms in scope", data.rooms.length], ['Created in range', data.rooms.filter(room => room.createdInPeriod).length], ['Active memberships now', data.rooms.reduce((sum, room) => sum + room.activeMembers, 0)], ['Pending memberships now', data.rooms.reduce((sum, room) => sum + room.pendingMembers, 0)]]} /><p className="analytics-note">Membership counts are current snapshots (a person in two rooms counts twice). Transaction counts and spending follow the date, currency, status and category filters.</p><Panel title="Room activity and membership"><Table headers={['Room', 'Active members', 'Pending members', 'Created in range', 'Transactions', 'Verified spending']} rows={roomRows} /></Panel></>}
      {tab === 'Users' && <><Metrics values={[["Users registered in range", data.users.summary[0]?.count ?? 0], ['Email verified now', data.users.summary[0]?.verified ?? 0], ['Admins now', data.users.summary[0]?.admins ?? 0]]} /><p className="analytics-note">Registrations during the date range. A room filter limits this to its current active members. Verification and admin roles show current status. Currency and transaction filters do not apply.</p><Panel title="Registration trend"><Trend rows={data.users.trend} money={false} /><Table headers={['Period', 'New users']} rows={data.users.trend.map(row => [row._id, row.count])} /></Panel></>}
    </>}
  </div>;
}
