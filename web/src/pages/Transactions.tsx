import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Eye,
  Filter,
  Image as ImageIcon,
  DollarSign,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import {
  fetchTransactions,
  createTransaction,
  updateTransactionStatus,
  deleteTransaction,
  fetchRooms,
  fetchUsers,
} from '../services/api';
import { subscribeSocketEvent } from '../services/socket';
import { Transaction, Room, User } from '../types';

const CATEGORIES = [
  'GROCERY',
  'UTILITIES',
  'RENT',
  'CLEANING',
  'FOOD',
  'TRANSPORT',
  'MEDICAL',
  'ENTERTAINMENT',
  'OTHER',
];

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('GROCERY');
  const [formRoomId, setFormRoomId] = useState('');
  const [formPaidBy, setFormPaidBy] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTransactions = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await fetchTransactions({
        search,
        status: statusFilter,
        category: categoryFilter,
        roomId: roomFilter || undefined,
        page,
        limit: 15,
      });
      setTransactions(data.transactions);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [roomsData, usersData] = await Promise.all([
        fetchRooms({ limit: 100 }),
        fetchUsers({ limit: 100 }),
      ]);
      setRooms(roomsData.rooms);
      setUsers(usersData.users);
      if (roomsData.rooms.length > 0 && !formRoomId) {
        setFormRoomId(roomsData.rooms[0]._id);
      }
      if (usersData.users.length > 0 && !formPaidBy) {
        setFormPaidBy(usersData.users[0]._id);
      }
    } catch (e) {
      console.error('Failed to load filter options:', e);
    }
  };

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, statusFilter, categoryFilter, roomFilter]);

  useEffect(() => {
    const unsubCreated = subscribeSocketEvent('transaction:created', () => loadTransactions(false));
    const unsubApproved = subscribeSocketEvent('transaction:approved', () => loadTransactions(false));
    const unsubRejected = subscribeSocketEvent('transaction:rejected', () => loadTransactions(false));
    const unsubUpdated = subscribeSocketEvent('transaction:updated', () => loadTransactions(false));
    const unsubDeleted = subscribeSocketEvent('transaction:deleted', () => loadTransactions(false));

    return () => {
      unsubCreated();
      unsubApproved();
      unsubRejected();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const handleStatusChange = async (txId: string, newStatus: string) => {
    try {
      await updateTransactionStatus(txId, newStatus);
      loadTransactions();
      if (selectedTx && selectedTx._id === txId) {
        setSelectedTx((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update transaction status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!txToDelete) return;
    try {
      await deleteTransaction(txToDelete._id);
      setIsDeleteModalOpen(false);
      setTxToDelete(null);
      loadTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete transaction');
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (!formTitle.trim() || isNaN(amountNum) || amountNum <= 0 || !formRoomId || !formPaidBy) {
      setFormError('Please fill in title, valid amount, room and payer.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createTransaction({
        roomId: formRoomId,
        title: formTitle.trim(),
        amount: amountNum,
        currency: 'NPR',
        category: formCategory,
        paidBy: formPaidBy,
        description: formDescription.trim() || undefined,
        status: 'VERIFIED',
      });
      setIsAddModalOpen(false);
      loadTransactions();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Header
        title="Transactions & Audit Log"
        subtitle="Review, approve, reject, or delete expense entries across all room groups."
        onRefresh={loadTransactions}
        isRefreshing={isLoading}
      />

      {/* Filter Bar */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-control"
              placeholder="Search expenses by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '40px' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Room Filter */}
          <select
            className="input-control"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            style={{ width: '140px', height: '40px', fontSize: '13px' }}
          >
            <option value="">All Rooms</option>
            {rooms.map((r) => (
              <option key={r._id} value={r._id}>{r.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="input-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '130px', height: '40px', fontSize: '13px' }}
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="VOIDED">Voided</option>
          </select>

          {/* Category Filter */}
          <select
            className="input-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '140px', height: '40px', fontSize: '13px' }}
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ height: '40px' }}>
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Room</th>
                <th>Paid By</th>
                <th>Amount</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && transactions.length === 0 ? (
                <TableSkeleton columns={8} />
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No transactions matching your criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(67, 97, 238, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          <Receipt size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tx.title}</div>
                          {tx.images && tx.images.length > 0 && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <ImageIcon size={10} /> Has Receipt Proof
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {(tx.roomId as any)?.name || 'N/A'}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {(tx.paidBy as any)?.name || 'Unknown'}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        NPR {tx.amount.toLocaleString()}
                      </span>
                    </td>

                    <td>
                      <Badge variant="cyan">{tx.category}</Badge>
                    </td>

                    <td>
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
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(tx.expenseDate || tx.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setIsDetailModalOpen(true);
                          }}
                          className="btn btn-secondary btn-icon"
                          title="View Details"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Eye size={14} />
                        </button>

                        {tx.status === 'PENDING' && (
                          <button
                            onClick={() => handleStatusChange(tx._id, 'VERIFIED')}
                            className="btn btn-secondary btn-icon"
                            title="Approve / Verify"
                            style={{ width: '32px', height: '32px', color: 'var(--accent-emerald)' }}
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setTxToDelete(tx);
                            setIsDeleteModalOpen(true);
                          }}
                          className="btn btn-danger btn-icon"
                          title="Delete Transaction"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing <strong>{transactions.length}</strong> of <strong>{total}</strong> entries
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: 'var(--text-primary)' }}>
              Page {page} of {pages || 1}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTx(null);
        }}
        title="Transaction Details"
        subtitle="Comprehensive breakdown, verifier audit, and receipt attachment."
        maxWidth="600px"
      >
        {selectedTx && (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h4 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedTx.title}
                </h4>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Room: {(selectedTx.roomId as any)?.name || 'N/A'} • Category: {selectedTx.category}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  NPR {selectedTx.amount.toLocaleString()}
                </div>
                <Badge
                  variant={
                    selectedTx.status === 'VERIFIED'
                      ? 'emerald'
                      : selectedTx.status === 'PENDING'
                      ? 'amber'
                      : 'rose'
                  }
                >
                  {selectedTx.status}
                </Badge>
              </div>
            </div>

            {selectedTx.description && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>DESCRIPTION / NOTES</label>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedTx.description}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>PAID BY</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {(selectedTx.paidBy as any)?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{(selectedTx.paidBy as any)?.email}</div>
              </div>

              <div className="glass-card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>RECORDED BY</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {(selectedTx.createdBy as any)?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Receipt Images */}
            {selectedTx.images && selectedTx.images.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  RECEIPT PROOFS ({selectedTx.images.length})
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {selectedTx.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                      <img
                        src={img}
                        alt="Receipt"
                        style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Status Change Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleStatusChange(selectedTx._id, 'VERIFIED')}
                  className="btn btn-sm btn-primary"
                  style={{ backgroundColor: 'var(--accent-emerald)' }}
                >
                  Approve (Verified)
                </button>
                <button
                  onClick={() => handleStatusChange(selectedTx._id, 'REJECTED')}
                  className="btn btn-sm btn-danger"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleStatusChange(selectedTx._id, 'VOIDED')}
                  className="btn btn-sm btn-secondary"
                >
                  Void
                </button>
              </div>

              <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Transaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Record Expense (Admin Entry)"
        subtitle="Log a new transaction directly into a flat group."
      >
        {formError && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#fda4af',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleCreateTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Expense Title *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Monthly Wi-Fi Bill"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Amount (NPR) *
              </label>
              <input
                type="number"
                step="0.01"
                className="input-control"
                placeholder="1500"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Category
              </label>
              <select
                className="input-control"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Flat / Room *
              </label>
              <select
                className="input-control"
                value={formRoomId}
                onChange={(e) => setFormRoomId(e.target.value)}
                required
              >
                {rooms.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Paid By *
              </label>
              <select
                className="input-control"
                value={formPaidBy}
                onChange={(e) => setFormPaidBy(e.target.value)}
                required
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Description / Notes (Optional)
            </label>
            <textarea
              className="input-control"
              placeholder="Additional billing details or receipt notes..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTxToDelete(null);
        }}
        title="Delete Transaction"
        subtitle="This action will permanently delete the expense from the database."
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, padding: '8px 0 20px' }}>
          Are you sure you want to permanently delete <strong>{txToDelete?.title}</strong> (NPR {txToDelete?.amount.toLocaleString()})?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="btn btn-danger">
            Delete Expense
          </button>
        </div>
      </Modal>
    </div>
  );
}
