import mongoose from 'mongoose';
import { InventoryItem, InventoryCategory, InventoryUnit } from './inventory.model';
import { emitToRoom } from '../../sockets/socket.server';
import { serverCache } from '../../utils/cache';
import { Room } from '../rooms/room.model';
import { createError } from '../../middleware/error.middleware';

async function assertRoomMember(roomId: string, userId: string): Promise<void> {
  const room = await Room.findOne({
    _id: roomId,
    members: { $elemMatch: { userId, status: 'ACTIVE' } },
  }).select('_id');
  if (!room) throw createError('You are not a member of this room', 403, 'NOT_MEMBER');
}

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

export async function getItemsByRoom(roomId: string, userId: string) {
  await assertRoomMember(roomId, userId);
  return serverCache.getOrSet(`inventory:room:${roomId}`, async () => {
    return InventoryItem.find({ roomId: new mongoose.Types.ObjectId(roomId), isActive: true })
      .populate('addedBy', 'name profileImage')
      .populate('lastUpdatedBy', 'name profileImage')
      .populate('verification.verifiedBy', 'name profileImage')
      .sort({ category: 1, name: 1 })
      .lean();
  }, 180);
}

export async function addItem(userId: string, payload: CreateItemPayload) {
  await assertRoomMember(payload.roomId, userId);
  const item = await InventoryItem.create({
    roomId: new mongoose.Types.ObjectId(payload.roomId),
    name: payload.name,
    category: payload.category ?? 'OTHER',
    quantity: payload.quantity,
    unit: payload.unit ?? 'pcs',
    minQuantity: payload.minQuantity,
    addedBy: new mongoose.Types.ObjectId(userId),
    lastUpdatedBy: new mongoose.Types.ObjectId(userId),
    status: 'PENDING',
  });

  const populated = await item.populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
  ]);

  // Invalidate caches
  serverCache.del(`inventory:room:${payload.roomId}`);
  serverCache.delPattern('admin:');

  // Real-time broadcast to room members and admin dashboard
  emitToRoom(payload.roomId, 'inventory:created', { item: populated });

  return populated;
}

export async function updateItem(itemId: string, userId: string, payload: UpdateItemPayload) {
  const existing = await InventoryItem.findById(itemId);
  if (!existing || !existing.isActive) return null;
  await assertRoomMember(existing.roomId.toString(), userId);
  if (existing.addedBy.toString() !== userId) {
    throw createError('Only the item creator can edit it', 403, 'FORBIDDEN');
  }

  const update: Record<string, unknown> = { lastUpdatedBy: new mongoose.Types.ObjectId(userId) };

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.quantity !== undefined) update.quantity = payload.quantity;
  if (payload.unit !== undefined) update.unit = payload.unit;
  if (payload.minQuantity !== undefined) {
    update.minQuantity = payload.minQuantity === null ? undefined : payload.minQuantity;
  }
  update.status = 'PENDING';
  update.verification = {};

  const item = await InventoryItem.findByIdAndUpdate(
    itemId,
    { $set: update },
    { new: true, runValidators: true }
  ).populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
    { path: 'verification.verifiedBy', select: 'name profileImage' },
  ]);

  if (item) {
    serverCache.del(`inventory:room:${item.roomId.toString()}`);
    serverCache.delPattern('admin:');
    emitToRoom(item.roomId.toString(), 'inventory:updated', { item });
  }

  return item;
}

export async function deleteItem(itemId: string, userId: string) {
  const existing = await InventoryItem.findById(itemId);
  if (!existing || !existing.isActive) return null;
  await assertRoomMember(existing.roomId.toString(), userId);
  if (existing.addedBy.toString() !== userId) {
    throw createError('Only the item creator can delete it', 403, 'FORBIDDEN');
  }
  const item = await InventoryItem.findByIdAndUpdate(itemId, { $set: { isActive: false } }, { new: true });
  if (item) {
    serverCache.del(`inventory:room:${item.roomId.toString()}`);
    serverCache.delPattern('admin:');
    emitToRoom(item.roomId.toString(), 'inventory:deleted', { itemId: item._id.toString() });
  }
  return item;
}

export async function reviewItem(
  itemId: string,
  userId: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string
) {
  const item = await InventoryItem.findById(itemId);
  if (!item || !item.isActive) throw createError('Item not found', 404, 'NOT_FOUND');
  await assertRoomMember(item.roomId.toString(), userId);
  if (item.addedBy.toString() === userId) {
    throw createError('You cannot review your own inventory item', 403, 'SELF_VERIFY_NOT_ALLOWED');
  }
  if (item.status !== 'PENDING') {
    throw createError(`Item is already ${item.status}`, 409, 'ALREADY_PROCESSED');
  }

  item.status = decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED';
  item.verification = {
    verifiedBy: new mongoose.Types.ObjectId(userId),
    decision,
    reason,
    verifiedAt: new Date(),
  };
  await item.save();
  const populated = await item.populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
    { path: 'verification.verifiedBy', select: 'name profileImage' },
  ]);
  serverCache.del(`inventory:room:${item.roomId.toString()}`);
  serverCache.delPattern('admin:');
  emitToRoom(item.roomId.toString(), 'inventory:updated', { item: populated });
  return populated;
}
