import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Home,
  Users,
  Copy,
  Check,
  Trash2,
  Calendar,
  Eye,
  Shield,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { fetchRooms, createRoom, deleteRoom, fetchUsers } from '../services/api';
import { subscribeSocketEvent } from '../services/socket';
import { Room, User } from '../types';

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCreatorId, setFormCreatorId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRooms = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await fetchRooms({
        search,
        page,
        limit: 15,
      });
      setRooms(data.rooms);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadUsersList = async () => {
    try {
      const data = await fetchUsers({ limit: 100 });
      setUsers(data.users);
      if (data.users.length > 0 && !formCreatorId) {
        setFormCreatorId(data.users[0]._id);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  useEffect(() => {
    loadRooms();
  }, [page]);

  useEffect(() => {
    const unsubCreated = subscribeSocketEvent('room:created', () => loadRooms(false));
    const unsubUpdated = subscribeSocketEvent('room:updated', () => loadRooms(false));
    const unsubDeleted = subscribeSocketEvent('room:deleted', () => loadRooms(false));

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadRooms();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCreatorId) {
      setFormError('Please enter a room name and select an owner.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createRoom({
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        creatorId: formCreatorId,
      });
      setIsAddModalOpen(false);
      setFormName('');
      setFormDescription('');
      loadRooms();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create room');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!roomToDelete) return;
    try {
      await deleteRoom(roomToDelete._id);
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
      loadRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  return (
    <div>
      <Header
        title="Rooms & Flats"
        subtitle="Manage flat spaces, invite codes, member rosters, and group permissions."
        onRefresh={loadRooms}
        isRefreshing={isLoading}
      />

      {/* Filter & Action Bar */}
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
              placeholder="Search flats by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" style={{ height: '40px' }}>
            Search
          </button>
        </form>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary" style={{ height: '40px' }}>
          <Plus size={16} />
          <span>Create Flat / Room</span>
        </button>
      </div>

      {/* Rooms Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Flat / Room</th>
                <th>Invite Code</th>
                <th>Owner / Creator</th>
                <th>Members</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading rooms...
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No flat groups found.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'rgba(114, 9, 183, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-secondary)',
                          }}
                        >
                          <Home size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</div>
                          {room.description && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '240px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {room.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div
                        onClick={() => handleCopyCode(room.inviteCode)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          color: 'var(--accent-cyan)',
                          fontWeight: 600,
                        }}
                        title="Click to copy invite code"
                      >
                        {copiedCode === room.inviteCode ? (
                          <>
                            <Check size={13} color="var(--accent-emerald)" />
                            <span style={{ color: 'var(--accent-emerald)' }}>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>{room.inviteCode}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {(room.createdBy as any)?.name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {(room.createdBy as any)?.email}
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {room.members?.length || 1}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(room.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setIsDetailModalOpen(true);
                          }}
                          className="btn btn-secondary btn-icon"
                          title="View Members Roster"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => {
                            setRoomToDelete(room);
                            setIsDeleteModalOpen(true);
                          }}
                          className="btn btn-danger btn-icon"
                          title="Delete Flat / Room"
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

        {/* Pagination */}
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
            Showing <strong>{rooms.length}</strong> of <strong>{total}</strong> rooms
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

      {/* Room Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRoom(null);
        }}
        title={selectedRoom ? selectedRoom.name : 'Room Roster'}
        subtitle="Members enrolled in this flat group."
        maxWidth="560px"
      >
        {selectedRoom && (
          <div>
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>INVITE CODE</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {selectedRoom.inviteCode}
              </div>
            </div>

            <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Members ({selectedRoom.members?.length || 0})
            </h5>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
              {selectedRoom.members?.map((m, idx) => {
                const userObj = m.userId as any;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {userObj?.name || 'Member'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{userObj?.email}</div>
                    </div>
                    <Badge variant={m.role === 'OWNER' ? 'indigo' : 'default'}>{m.role}</Badge>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Room Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Flat / Room"
        subtitle="Initialize a new flat group with an owner."
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

        <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Flat / Room Name *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Kathmandu Penthouse, Flat 3B"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Assigned Room Owner *
            </label>
            <select
              className="input-control"
              value={formCreatorId}
              onChange={(e) => setFormCreatorId(e.target.value)}
              required
            >
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Description / Notes (Optional)
            </label>
            <textarea
              className="input-control"
              placeholder="Apartment location, rules, notes..."
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
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Room Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setRoomToDelete(null);
        }}
        title="Delete Flat / Room"
        subtitle="Cascading delete warning."
      >
        <div style={{ padding: '8px 0 20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong>{roomToDelete?.name}</strong>?
          </p>
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-md)',
              color: '#fda4af',
              fontSize: '12.5px',
            }}
          >
            ⚠️ Warning: Deleting this room will cascade and permanently remove all associated transactions and inventory items!
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="btn btn-danger">
            Delete Room & Data
          </button>
        </div>
      </Modal>
    </div>
  );
}
