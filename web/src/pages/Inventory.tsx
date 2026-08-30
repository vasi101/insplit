import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Boxes,
  AlertTriangle,
  Minus,
  Trash2,
  Edit2,
  CheckCircle,
  Home,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import {
  fetchInventory,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchRooms,
} from '../services/api';
import { subscribeSocketEvent } from '../services/socket';
import { InventoryItem, Room, InventoryCategory, InventoryUnit } from '../types';

const CATEGORIES: { key: InventoryCategory | 'ALL'; label: string; icon: string }[] = [
  { key: 'ALL', label: 'All Categories', icon: '🗂️' },
  { key: 'KITCHEN', label: 'Kitchen', icon: '🍳' },
  { key: 'CLEANING', label: 'Cleaning', icon: '🧹' },
  { key: 'BATHROOM', label: 'Bathroom', icon: '🚿' },
  { key: 'PANTRY', label: 'Pantry', icon: '🥫' },
  { key: 'OTHER', label: 'Other', icon: '📦' },
];

const UNITS: InventoryUnit[] = ['pcs', 'kg', 'L', 'packets', 'boxes', 'other'];

export function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected item
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRoomId, setFormRoomId] = useState('');
  const [formCategory, setFormCategory] = useState<InventoryCategory>('KITCHEN');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formUnit, setFormUnit] = useState<InventoryUnit>('pcs');
  const [formMinQuantity, setFormMinQuantity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadInventory = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const data = await fetchInventory({
        search,
        category: categoryFilter,
        roomId: roomFilter || undefined,
        page,
        limit: 20,
      });
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const data = await fetchRooms({ limit: 100 });
      setRooms(data.rooms);
      if (data.rooms.length > 0 && !formRoomId) {
        setFormRoomId(data.rooms[0]._id);
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [page, categoryFilter, roomFilter]);

  useEffect(() => {
    const unsubCreated = subscribeSocketEvent('inventory:created', () => loadInventory(false));
    const unsubUpdated = subscribeSocketEvent('inventory:updated', () => loadInventory(false));
    const unsubDeleted = subscribeSocketEvent('inventory:deleted', () => loadInventory(false));

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadInventory();
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormCategory('KITCHEN');
    setFormQuantity('1');
    setFormUnit('pcs');
    setFormMinQuantity('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(String(item.quantity));
    setFormUnit(item.unit);
    setFormMinQuantity(item.minQuantity != null ? String(item.minQuantity) : '');
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(formQuantity);
    if (!formName.trim() || isNaN(qty) || qty < 0 || !formRoomId) {
      setFormError('Please enter item name, valid quantity, and room.');
      return;
    }

    const minQty = formMinQuantity.trim() ? parseFloat(formMinQuantity) : undefined;

    try {
      setIsSubmitting(true);
      setFormError(null);
      await addInventoryItem({
        roomId: formRoomId,
        name: formName.trim(),
        category: formCategory,
        quantity: qty,
        unit: formUnit,
        minQuantity: minQty,
      });
      setIsAddModalOpen(false);
      loadInventory();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = parseFloat(formQuantity);
    if (!formName.trim() || isNaN(qty) || qty < 0) {
      setFormError('Please enter valid name and quantity.');
      return;
    }

    const minQty = formMinQuantity.trim() ? parseFloat(formMinQuantity) : null;

    try {
      setIsSubmitting(true);
      setFormError(null);
      await updateInventoryItem(selectedItem._id, {
        name: formName.trim(),
        category: formCategory,
        quantity: qty,
        unit: formUnit,
        minQuantity: minQty,
      });
      setIsEditModalOpen(false);
      loadInventory();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustQuantity = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    try {
      await updateInventoryItem(item._id, { quantity: newQty });
      setItems((prev) => prev.map((i) => (i._id === item._id ? { ...i, quantity: newQty } : i)));
    } catch (err: any) {
      alert('Could not adjust quantity');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      await deleteInventoryItem(itemToDelete._id);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadInventory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  return (
    <div>
      <Header
        title="Inventory Hub"
        subtitle="Manage physical stock, quantities, units, and low-inventory warnings across all flats."
        onRefresh={loadInventory}
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
              placeholder="Search items by name..."
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

          {/* Category Filter */}
          <select
            className="input-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '150px', height: '40px', fontSize: '13px' }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
            ))}
          </select>

          <button onClick={handleOpenAdd} className="btn btn-primary" style={{ height: '40px' }}>
            <Plus size={16} />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Room</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Low-Stock Alert</th>
                <th>Last Updated By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Loading inventory stock...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isLow = item.minQuantity != null && item.quantity <= item.minQuantity;
                  return (
                    <tr key={item._id} style={{ backgroundColor: isLow ? 'rgba(245, 158, 11, 0.04)' : undefined }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isLow ? 'rgba(245, 158, 11, 0.15)' : 'rgba(67, 97, 238, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '15px',
                            }}
                          >
                            {CATEGORIES.find((c) => c.key === item.category)?.icon || '📦'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                            {isLow && (
                              <div style={{ fontSize: '11px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                <AlertTriangle size={11} /> Stock Running Low
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {(item.roomId as any)?.name || 'N/A'}
                        </span>
                      </td>

                      <td>
                        <Badge variant="cyan">{item.category}</Badge>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleAdjustQuantity(item, -1)}
                            className="btn btn-secondary btn-icon"
                            style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)' }}
                            title="Decrease quantity"
                          >
                            <Minus size={12} />
                          </button>

                          <span style={{ minWidth: '46px', textAlign: 'center', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {item.quantity} <small style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unit}</small>
                          </span>

                          <button
                            onClick={() => handleAdjustQuantity(item, 1)}
                            className="btn btn-secondary btn-icon"
                            style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)' }}
                            title="Increase quantity"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      <td>
                        {item.minQuantity != null ? (
                          <span style={{ fontSize: '12px', color: isLow ? 'var(--accent-amber)' : 'var(--text-muted)', fontWeight: isLow ? 700 : 400 }}>
                            Below {item.minQuantity} {item.unit}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {(item.lastUpdatedBy as any)?.name || 'Member'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="btn btn-secondary btn-icon"
                            title="Edit Item"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteModalOpen(true);
                            }}
                            className="btn btn-danger btn-icon"
                            title="Delete Stock Item"
                            style={{ width: '32px', height: '32px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
            Showing <strong>{items.length}</strong> of <strong>{total}</strong> stock items
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

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Inventory Item"
        subtitle="Record supplies or groceries to monitor stock levels."
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

        <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Item Name *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Basmati Rice, Detergent, Soap"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Flat / Room *
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
                Category
              </label>
              <select
                className="input-control"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
              >
                {CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                className="input-control"
                placeholder="5"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Unit
              </label>
              <select
                className="input-control"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as any)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Low-Stock Threshold (Optional)
            </label>
            <input
              type="number"
              step="0.1"
              className="input-control"
              placeholder="e.g. 1 (Trigger alert when stock drops to or below)"
              value={formMinQuantity}
              onChange={(e) => setFormMinQuantity(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Saving...' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Inventory Item"
        subtitle="Update name, quantity, or low stock trigger."
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

        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Item Name *
            </label>
            <input
              type="text"
              className="input-control"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                className="input-control"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Unit
              </label>
              <select
                className="input-control"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value as any)}
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Low-Stock Threshold
            </label>
            <input
              type="number"
              step="0.1"
              className="input-control"
              placeholder="Leave empty to disable alert"
              value={formMinQuantity}
              onChange={(e) => setFormMinQuantity(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Item Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Delete Item"
        subtitle="This action will remove the item from flat inventory."
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, padding: '8px 0 20px' }}>
          Are you sure you want to permanently delete <strong>{itemToDelete?.name}</strong>?
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleDeleteConfirm} className="btn btn-danger">
            Delete Item
          </button>
        </div>
      </Modal>
    </div>
  );
}
