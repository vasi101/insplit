import mongoose from 'mongoose';
import { InventoryItem, InventoryCategory, InventoryUnit } from './inventory.model';
import { emitToRoom } from '../../sockets/socket.server';
import { serverCache } from '../../utils/cache';
import { Room } from '../rooms/room.model';
import { createError } from '../../middleware/error.middleware';
import { User } from '../auth/auth.model';
import { assertStockUnit } from './inventory.units';
import { sendPushNotifications, userPushTokens } from '../../notifications/push.service';

async function notifyInventoryReview(roomId: string, userId: string, itemId: string, name: string, quantity: number, unit: string) {
  if (quantity <= 0) return;
  const room = await Room.findById(roomId).select('members').lean();
  if (!room) return;
  const recipients = room.members.filter(member => member.status === 'ACTIVE' && member.userId.toString() !== userId);
  const users = await User.find({ _id: { $in: recipients.map(member => member.userId) } }).select('pushToken pushTokens').lean();
  const creator = await User.findById(userId).select('name').lean();
  await sendPushNotifications(users.flatMap(userPushTokens), {
    title: 'Inventory contribution needs verification',
    body: `${creator?.name ?? 'A roommate'} brought ${quantity} ${unit} of ${name}. Open Inventory to approve or reject.`,
    data: { type: 'INVENTORY_PENDING', roomId, itemId },
  });
}

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
  const unit = payload.unit ?? (payload.name.trim().toLowerCase() === 'oil' ? 'L' : 'kg');
  assertStockUnit(payload.name, unit, Number(payload.quantity));
  const item = await InventoryItem.create({
    roomId: new mongoose.Types.ObjectId(payload.roomId),
    name: payload.name,
    category: payload.category ?? 'OTHER',
    quantity: payload.quantity,
    unit,
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
  void notifyInventoryReview(payload.roomId, userId, item._id.toString(), item.name, item.quantity, item.unit)
    .catch(error => console.error('Failed to notify roommates about inventory:', error));

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
  if (payload.name !== undefined || payload.unit !== undefined || payload.quantity !== undefined) {
    assertStockUnit(payload.name ?? existing.name, payload.unit ?? existing.unit, Number(payload.quantity ?? existing.quantity));
  }

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
    void notifyInventoryReview(item.roomId.toString(), userId, item._id.toString(), item.name, item.quantity, item.unit)
      .catch(error => console.error('Failed to notify roommates about inventory:', error));
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

  const verification = {
    verifiedBy: new mongoose.Types.ObjectId(userId),
    decision,
    reason,
    verifiedAt: new Date(),
  };
  // Only one roommate can complete a review, and never review a concurrently edited entry.
  const reviewed = await InventoryItem.findOneAndUpdate(
    { _id: itemId, isActive: true, status: 'PENDING', updatedAt: item.updatedAt },
    { $set: { status: decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED', verification } },
    { new: true, runValidators: true }
  );
  if (!reviewed) throw createError('This contribution changed. Refresh before reviewing.', 409, 'ALREADY_PROCESSED');
  const populated = await reviewed.populate([
    { path: 'addedBy', select: 'name profileImage' },
    { path: 'lastUpdatedBy', select: 'name profileImage' },
    { path: 'verification.verifiedBy', select: 'name profileImage' },
  ]);
  serverCache.del(`inventory:room:${item.roomId.toString()}`);
  serverCache.delPattern('admin:');
  emitToRoom(item.roomId.toString(), 'inventory:updated', { item: populated });
  return populated;
}
