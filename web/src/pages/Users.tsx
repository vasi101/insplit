import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  UserCheck,
  Shield,
  ShieldAlert,
  Trash2,
  Eye,
  Mail,
  Phone,
  Home,
  CheckCircle,
  XCircle,
  Edit2,
  Calendar,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import {
  fetchUsers,
  fetchUserDetails,
  createNewUser,
  updateUserDetails,
  deleteUser,
  toggleAdminRole,
  sendUserVerificationEmail,
  toggleUserVerification,
} from '../services/api';
import { subscribeSocketEvent } from '../services/socket';
import { User, Room } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected User
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<{ user: User; rooms: Room[]; stats: { transactionsCount: number; totalSpent: number } } | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formIsAdmin, setFormIsAdmin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await fetchUsers({
        search,
        role: roleFilter,
        verified: verifiedFilter,
        page,
        limit: 15,
      });
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, verifiedFilter]);

  useEffect(() => {
    const unsubCreated = subscribeSocketEvent('user:created', () => loadUsers(false));
    const unsubUpdated = subscribeSocketEvent('user:updated', () => loadUsers(false));
    const unsubDeleted = subscribeSocketEvent('user:deleted', () => loadUsers(false));

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormIsAdmin(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createNewUser({
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword || undefined,
        phone: formPhone.trim() || undefined,
        isAdmin: formIsAdmin,
      });
      setIsAddModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
    try {
      const details = await fetchUserDetails(user._id);
      setUserDetails(details);
    } catch (err) {
      console.error('Failed to load user details:', err);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    const nextRole = !user.isAdmin;
    const confirmMsg = nextRole
      ? `Promote ${user.name} to Administrator? They will have full access to this dashboard.`
      : `Revoke Administrator privileges for ${user.name}?`;

    if (window.confirm(confirmMsg)) {
      try {
        await toggleAdminRole(user._id, nextRole);
        loadUsers();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Could not update admin role');
      }
    }
  };

  const handleSendVerification = async (user: User) => {
    try {
      await sendUserVerificationEmail(user._id);
      alert(`✅ 6-digit verification code sent to ${user.email} (Check your inbox or server terminal in dev mode)`);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send verification email');
    }
  };

  const handleToggleVerification = async (user: User) => {
    const nextStatus = !user.emailVerified;
    try {
      await toggleUserVerification(user._id, nextStatus);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update verification status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete._id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div>
      <Header
        title="User Directory"
        subtitle="Manage registered members, access permissions, verification status, and flat memberships."
        onRefresh={loadUsers}
        isRefreshing={isLoading}
      />

      {/* Action & Filter Bar */}
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
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', maxWidth: '460px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input-control"
              placeholder="Search by name, email or phone..."
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
          <select
            className="input-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '130px', height: '40px', fontSize: '13px' }}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins Only</option>
            <option value="user">Users Only</option>
          </select>

          <select
            className="input-control"
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            style={{ width: '140px', height: '40px', fontSize: '13px' }}
          >
            <option value="all">All Statuses</option>
            <option value="true">Verified Only</option>
            <option value="false">Unverified</option>
          </select>

          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ height: '40px' }}>
            <Plus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Flats</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No users matching the filters found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: user.isAdmin ? 'var(--accent-secondary)' : 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {user.name ? user.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            ID: {user._id.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{user.email}</div>
                      {user.phone && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.phone}</div>
                      )}
                    </td>

                    <td>
                      {user.isAdmin ? (
                        <Badge variant="indigo" icon={<Shield size={12} />}>
                          Administrator
                        </Badge>
                      ) : (
                        <Badge variant="default">Member</Badge>
                      )}
                    </td>

                    <td>
                      <Badge variant={user.emailVerified ? 'emerald' : 'amber'}>
                        {user.emailVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)' }}>
                        <Home size={14} color="var(--text-muted)" />
                        <span>{user.roomsCount || 0}</span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleSendVerification(user)}
                          className="btn btn-secondary btn-icon"
                          title="Send Email Verification Code"
                          style={{ width: '32px', height: '32px', color: 'var(--accent-cyan)' }}
                        >
                          <Mail size={14} />
                        </button>

                        <button
                          onClick={() => handleToggleVerification(user)}
                          className={`btn ${user.emailVerified ? 'btn-secondary' : 'btn-primary'} btn-icon`}
                          title={user.emailVerified ? 'Mark as Unverified' : 'Mark as Verified'}
                          style={{ width: '32px', height: '32px', color: user.emailVerified ? 'var(--text-muted)' : '#ffffff' }}
                        >
                          <CheckCircle size={14} />
                        </button>

                        <button
                          onClick={() => handleViewUser(user)}
                          className="btn btn-secondary btn-icon"
                          title="View Profile Details"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => handleToggleAdmin(user)}
                          className={`btn ${user.isAdmin ? 'btn-danger' : 'btn-secondary'} btn-icon`}
                          title={user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Shield size={14} />
                        </button>

                        <button
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteModalOpen(true);
                          }}
                          className="btn btn-danger btn-icon"
                          title="Delete User"
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
            Showing <strong>{users.length}</strong> of <strong>{total}</strong> users
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

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New User"
        subtitle="Create an account directly from the admin panel."
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

        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Full Name *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. John Doe"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Email Address *
            </label>
            <input
              type="email"
              className="input-control"
              placeholder="user@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Phone Number
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="+977 9800000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password (leave empty for default)
            </label>
            <input
              type="password"
              className="input-control"
              placeholder="Defaults to Insplit@123"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <input
              type="checkbox"
              id="adminCheckbox"
              checked={formIsAdmin}
              onChange={(e) => setFormIsAdmin(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
            />
            <label htmlFor="adminCheckbox" style={{ fontSize: '13.5px', color: 'var(--text-primary)', cursor: 'pointer' }}>
              Grant Administrator Privileges
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedUser(null);
          setUserDetails(null);
        }}
        title={selectedUser ? selectedUser.name : 'User Details'}
        subtitle="Complete member profile and room associations."
        maxWidth="620px"
      >
        {selectedUser && (
          <div>
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '20px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '22px',
                }}
              >
                {selectedUser.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedUser.name}
                  </h4>
                  {selectedUser.isAdmin && <Badge variant="indigo">Admin</Badge>}
                  <Badge variant={selectedUser.emailVerified ? 'emerald' : 'amber'}>
                    {selectedUser.emailVerified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selectedUser.email} {selectedUser.phone ? `• ${selectedUser.phone}` : ''}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div className="glass-card" style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TRANSACTIONS CREATED</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {userDetails?.stats.transactionsCount ?? '...'}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SPENT (VERIFIED)</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  NPR {userDetails?.stats.totalSpent?.toLocaleString() ?? '...'}
                </div>
              </div>
            </div>

            {/* Associated Rooms */}
            <h5 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Joined Rooms & Flats ({userDetails?.rooms.length || 0})
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {!userDetails ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading flat associations...</div>
              ) : userDetails.rooms.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>User has not joined any rooms yet.</div>
              ) : (
                userDetails.rooms.map((room) => (
                  <div
                    key={room._id}
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
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{room.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invite Code: {room.inviteCode}</div>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {room.members?.length || 1} members
                    </span>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setIsDetailModalOpen(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        title="Delete User"
        subtitle="This action will permanently delete the user account and remove them from all flat groups."
      >
        <div style={{ padding: '8px 0 20px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            Are you sure you want to permanently delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})?
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirmDelete} className="btn btn-danger">
            Delete User Account
          </button>
        </div>
      </Modal>
    </div>
  );
}
