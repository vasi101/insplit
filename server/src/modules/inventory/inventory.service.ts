import mongoose from 'mongoose';
import { InventoryItem, InventoryCategory, InventoryUnit } from './inventory.model';
import { emitToRoom } from '../../sockets/socket.server';

export interface CreateItemPayload {
  roomId: string;
  name: string;
  category?: InventoryCategory;
  quantity: number;
  unit?: InventoryUnit;
  minQuantity?: number;
}

export interface UpdateItemPayload {
  name?: string;
  category?: InventoryCategory;
  quantity?: number;
  unit?: InventoryUnit;
  minQuantity?: number | null;
}

export async function getItemsByRoom(roomId: string) {
  return InventoryItem.find({ roomId: new mongoose.Types.ObjectId(roomId), isActive: true })
    .populate('addedBy', 'name profileImage')
    .populate('lastUpdatedBy', 'name profileImage')
    .sort({ category: 1, name: 1 })
    .lean();
}

export async function addItem(userId: string, payload: CreateItemPayload) {
  const item = await InventoryItem.create({
    roomId: new mongoose.Types.ObjectId(payload.roomId),
    name: payload.name,
    category: payload.category ?? 'OTHER',
    quantity: payload.quantity,
    unit: payload.unit ?? 'pcs',
    minQuantity: payload.minQuantity,
    addedBy: new mongoose.Types.ObjectId(userId),
    lastUpdatedBy: new mongoose.Types.ObjectId(userId),
  });

  const populated = await item.populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
  ]);

  // Real-time broadcast to room members and admin dashboard
  emitToRoom(payload.roomId, 'inventory:created', { item: populated });

  return populated;
}

export async function updateItem(itemId: string, userId: string, payload: UpdateItemPayload) {
  const update: Record<string, unknown> = { lastUpdatedBy: new mongoose.Types.ObjectId(userId) };

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.quantity !== undefined) update.quantity = payload.quantity;
  if (payload.unit !== undefined) update.unit = payload.unit;
  if (payload.minQuantity !== undefined) {
    update.minQuantity = payload.minQuantity === null ? undefined : payload.minQuantity;
  }

  const item = await InventoryItem.findByIdAndUpdate(
    itemId,
    { $set: update },
    { new: true, runValidators: true }
  ).populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
  ]);

  if (item) {
    emitToRoom(item.roomId.toString(), 'inventory:updated', { item });
  }

  return item;
}

export async function deleteItem(itemId: string) {
  const item = await InventoryItem.findByIdAndUpdate(itemId, { $set: { isActive: false } }, { new: true });
  if (item) {
    emitToRoom(item.roomId.toString(), 'inventory:deleted', { itemId: item._id.toString() });
  }
  return item;
}
