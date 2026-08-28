import mongoose from 'mongoose';
import { Transaction, ITransaction, TransactionCategory } from './transaction.model';
import { Room } from '../rooms/room.model';
import { createError } from '../../middleware/error.middleware';
import { getSocketServer } from '../../sockets/socket.server';
import { sendPushNotifications } from '../../notifications/push.service';
import { User } from '../auth/auth.model';

export interface CreateTransactionInput {
  roomId: string;
  createdBy: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category?: TransactionCategory;
  paidBy: string;
  expenseDate: string | Date;
  images?: string[];
  localId?: string;
}

export interface ListTransactionsQuery {
  roomId: string;
  userId: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function assertRoomMember(roomId: string, userId: string) {
  const room = await Room.findById(roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');
  const isMember = room.members.some(
    (m) => m.userId.toString() === userId && m.status === 'ACTIVE'
  );
  if (!isMember) throw createError('You are not a member of this room', 403, 'NOT_MEMBER');
  return room;
}

async function getRoomMemberPushTokens(roomId: string, excludeUserId: string): Promise<string[]> {
  const room = await Room.findById(roomId).populate<{ 'members.userId': { pushToken?: string } }>('members.userId', 'pushToken');
  if (!room) return [];

  const tokens: string[] = [];
  for (const member of room.members) {
    if (member.userId.toString() === excludeUserId) continue;
    if (member.status !== 'ACTIVE') continue;
    const user = await User.findById(member.userId).select('pushToken');
    if (user?.pushToken) tokens.push(user.pushToken);
  }
  return tokens;
}

// ─── Service Functions ────────────────────────────────────────────────────────

export async function createTransaction(input: CreateTransactionInput): Promise<ITransaction> {
  // Rule 1 & 2: Must belong to a room, creator must be a member
  await assertRoomMember(input.roomId, input.createdBy);

  // Prevent duplicate localId (offline sync dedup)
  if (input.localId) {
    const existing = await Transaction.findOne({ localId: input.localId });
    if (existing) return existing; // Idempotent — return existing record
  }

  const transaction = await Transaction.create({
    roomId: input.roomId,
    createdBy: input.createdBy,
    title: input.title,
    description: input.description,
    amount: input.amount,
    currency: input.currency ?? 'NPR',
    category: input.category ?? 'OTHER',
    paidBy: input.paidBy,
    expenseDate: new Date(input.expenseDate),
    images: input.images ?? [],
    status: 'PENDING',
    localId: input.localId,
  });

  const populated = await transaction.populate([
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
  ]);

  // Emit real-time event to room members
  const io = getSocketServer();
  if (io) {
    io.to(`room:${input.roomId}`).emit('transaction:created', { transaction: populated });
  }

  // Send push notifications to other members (Rule 8: only after successful save)
  const pushTokens = await getRoomMemberPushTokens(input.roomId, input.createdBy);
  const creator = await User.findById(input.createdBy).select('name');
  if (pushTokens.length > 0 && creator) {
    sendPushNotifications(pushTokens, {
      title: 'New Expense Requires Verification',
      body: `${creator.name} added ${input.currency ?? 'NPR'} ${input.amount} for ${input.title}. Tap to review.`,
      data: { type: 'TRANSACTION_PENDING', transactionId: transaction._id.toString() },
    }).catch(console.error); // Non-blocking
  }

  return populated;
}

export async function listTransactions(query: ListTransactionsQuery): Promise<{
  transactions: ITransaction[];
  total: number;
  page: number;
  pages: number;
}> {
  await assertRoomMember(query.roomId, query.userId);

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { roomId: query.roomId };
  if (query.status) filter.status = query.status;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('createdBy', 'name email profileImage')
      .populate('paidBy', 'name email profileImage')
      .populate('verification.verifiedBy', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return { transactions, total, page, pages: Math.ceil(total / limit) };
}

export async function getTransactionById(transactionId: string, userId: string): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId)
    .populate('createdBy', 'name email profileImage')
    .populate('paidBy', 'name email profileImage')
    .populate('verification.verifiedBy', 'name email profileImage');

  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  await assertRoomMember(transaction.roomId.toString(), userId);

  return transaction;
}

export async function approveTransaction(transactionId: string, verifierId: string): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  await assertRoomMember(transaction.roomId.toString(), verifierId);

  // Rule 3: Creator cannot verify their own transaction
  if (transaction.createdBy.toString() === verifierId) {
    throw createError('You cannot verify your own transaction', 403, 'SELF_VERIFY_NOT_ALLOWED');
  }

  if (transaction.status !== 'PENDING') {
    throw createError(`Transaction is already ${transaction.status}`, 409, 'ALREADY_PROCESSED');
  }

  transaction.status = 'VERIFIED';
  transaction.verification = {
    verifiedBy: new mongoose.Types.ObjectId(verifierId),
    decision: 'APPROVED',
    verifiedAt: new Date(),
  };
  await transaction.save();

  const populated = await transaction.populate([
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
    { path: 'verification.verifiedBy', select: 'name email profileImage' },
  ]);

  const io = getSocketServer();
  if (io) {
    io.to(`room:${transaction.roomId}`).emit('transaction:approved', { transaction: populated });
  }

  // Notify the creator
  const creator = await User.findById(transaction.createdBy).select('pushToken name');
  const verifier = await User.findById(verifierId).select('name');
  if (creator?.pushToken && verifier) {
    sendPushNotifications([creator.pushToken], {
      title: 'Expense Approved ✅',
      body: `${verifier.name} approved your expense: ${transaction.title}`,
      data: { type: 'TRANSACTION_APPROVED', transactionId: transactionId },
    }).catch(console.error);
  }

  return populated;
}

export async function rejectTransaction(
  transactionId: string,
  verifierId: string,
  reason?: string
): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  await assertRoomMember(transaction.roomId.toString(), verifierId);

  // Rule 3
  if (transaction.createdBy.toString() === verifierId) {
    throw createError('You cannot verify your own transaction', 403, 'SELF_VERIFY_NOT_ALLOWED');
  }

  if (transaction.status !== 'PENDING') {
    throw createError(`Transaction is already ${transaction.status}`, 409, 'ALREADY_PROCESSED');
  }

  transaction.status = 'REJECTED';
  transaction.verification = {
    verifiedBy: new mongoose.Types.ObjectId(verifierId),
    decision: 'REJECTED',
    reason,
    verifiedAt: new Date(),
  };
  await transaction.save();

  const populated = await transaction.populate([
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
    { path: 'verification.verifiedBy', select: 'name email profileImage' },
  ]);

  const io = getSocketServer();
  if (io) {
    io.to(`room:${transaction.roomId}`).emit('transaction:rejected', { transaction: populated });
  }

  // Notify the creator
  const creator = await User.findById(transaction.createdBy).select('pushToken');
  const verifier = await User.findById(verifierId).select('name');
  if (creator?.pushToken && verifier) {
    sendPushNotifications([creator.pushToken], {
      title: 'Expense Rejected ❌',
      body: `${verifier.name} rejected your expense: ${transaction.title}${reason ? ` — ${reason}` : ''}`,
      data: { type: 'TRANSACTION_REJECTED', transactionId: transactionId },
    }).catch(console.error);
  }

  return populated;
}

export async function updateTransaction(
  transactionId: string,
  userId: string,
  updates: Partial<CreateTransactionInput>
): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  // Rule 3: Only creator can edit
  if (transaction.createdBy.toString() !== userId) {
    throw createError('Only the creator can edit this transaction', 403, 'FORBIDDEN');
  }

  // Rule: Only PENDING transactions are editable
  if (transaction.status !== 'PENDING') {
    throw createError('Only pending transactions can be edited', 409, 'NOT_EDITABLE');
  }

  const allowedUpdates = ['title', 'description', 'amount', 'category', 'paidBy', 'expenseDate', 'images'];
  for (const key of allowedUpdates) {
    if (updates[key as keyof CreateTransactionInput] !== undefined) {
      (transaction as unknown as Record<string, unknown>)[key] = updates[key as keyof CreateTransactionInput];
    }
  }

  await transaction.save();
  return transaction.populate([
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
  ]);
}

export async function voidTransaction(transactionId: string, userId: string): Promise<ITransaction> {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  if (transaction.createdBy.toString() !== userId) {
    throw createError('Only the creator can void this transaction', 403, 'FORBIDDEN');
  }

  if (transaction.status === 'VOIDED') {
    throw createError('Transaction is already voided', 409, 'ALREADY_VOIDED');
  }

  transaction.status = 'VOIDED';
  await transaction.save();

  const io = getSocketServer();
  if (io) {
    io.to(`room:${transaction.roomId}`).emit('transaction:updated', { transaction });
  }

  return transaction;
}
