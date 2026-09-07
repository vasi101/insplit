import mongoose from 'mongoose';
import { Transaction, ITransaction, TransactionCategory } from './transaction.model';
import { Room } from '../rooms/room.model';
import { createError } from '../../middleware/error.middleware';
import { emitToRoom } from '../../sockets/socket.server';
import { sendPushNotifications, userPushTokens } from '../../notifications/push.service';
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

const EXPENSE_CORRECTION_WINDOW_MS = 30_000;

function assertWithinCorrectionWindow(transaction: ITransaction): void {
  const elapsed = Date.now() - transaction.createdAt.getTime();
  if (elapsed >= EXPENSE_CORRECTION_WINDOW_MS) {
    throw createError(
      'The 30-second edit and delete window has expired',
      409,
      'CORRECTION_WINDOW_EXPIRED'
    );
  }
}

function assertCorrectionWindowClosed(transaction: ITransaction): void {
  const remainingMs = transaction.createdAt.getTime() + EXPENSE_CORRECTION_WINDOW_MS - Date.now();
  if (remainingMs > 0) {
    throw createError(
      `This expense can be reviewed in ${Math.ceil(remainingMs / 1000)} seconds`,
      409,
      'CORRECTION_WINDOW_ACTIVE'
    );
  }
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
  const room = await Room.findById(roomId).select('members');
  if (!room) return [];

  const memberIds = room.members
    .filter(
      (member) =>
        member.status === 'ACTIVE' && member.userId.toString() !== excludeUserId
    )
    .map((member) => member.userId);

  if (memberIds.length === 0) return [];

  const users = await User.find({ _id: { $in: memberIds } }).select('pushToken pushTokens').lean();
  return users.flatMap(userPushTokens);
}

async function notifyTransactionCreated(
  transaction: ITransaction,
  input: CreateTransactionInput
): Promise<void> {
  const pushTokens = await getRoomMemberPushTokens(input.roomId, input.createdBy);
  const creator = await User.findById(input.createdBy).select('name').lean();
  if (pushTokens.length === 0 || !creator) return;

  await sendPushNotifications(pushTokens, {
    title: 'New transaction',
    body: `${creator.name} added ${!input.currency || input.currency === 'NPR' ? 'Rs.' : input.currency} ${input.amount} ? ${input.title}.`,
    data: { type: 'TRANSACTION_PENDING', roomId: input.roomId, transactionId: transaction._id.toString() },
  });
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

  // Emit real-time event to room members and admin
  emitToRoom(input.roomId, 'transaction:created', { transaction: populated });

  // Send push notifications to other members (Rule 8: only after successful save)
  // Notification failures must not turn an already-saved expense into a 500.
  void notifyTransactionCreated(transaction, input).catch((error) => {
    console.error('Failed to notify room members about new expense:', error);
  });

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
  // The default feed excludes rejected entries; the REJECTED tab requests them explicitly.
  filter.status = query.status || { $ne: 'REJECTED' };

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

  // Give the creator the full correction window before another member can decide.
  assertCorrectionWindowClosed(transaction);

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

  emitToRoom(transaction.roomId.toString(), 'transaction:approved', { transaction: populated });

  // Notify the creator
  const creator = await User.findById(transaction.createdBy).select('pushToken pushTokens name');
  const verifier = await User.findById(verifierId).select('name');
  if (creator && verifier) {
    sendPushNotifications(userPushTokens(creator), {
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

  assertCorrectionWindowClosed(transaction);

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

  emitToRoom(transaction.roomId.toString(), 'transaction:rejected', { transaction: populated });

  // Notify the creator
  const creator = await User.findById(transaction.createdBy).select('pushToken pushTokens');
  const verifier = await User.findById(verifierId).select('name');
  if (creator && verifier) {
    sendPushNotifications(userPushTokens(creator), {
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

  assertWithinCorrectionWindow(transaction);

  const allowedUpdates = ['title', 'description', 'amount', 'category', 'paidBy', 'expenseDate', 'images'];
  for (const key of allowedUpdates) {
    if (updates[key as keyof CreateTransactionInput] !== undefined) {
      (transaction as unknown as Record<string, unknown>)[key] = updates[key as keyof CreateTransactionInput];
    }
  }

  await transaction.save();
  const populated = await transaction.populate([
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
  ]);
  emitToRoom(transaction.roomId.toString(), 'transaction:updated', { transaction: populated });
  return populated;
}

export async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) throw createError('Transaction not found', 404, 'NOT_FOUND');

  if (transaction.createdBy.toString() !== userId) {
    throw createError('Only the creator can delete this transaction', 403, 'FORBIDDEN');
  }

  if (transaction.status !== 'PENDING') {
    throw createError('Only pending transactions can be deleted', 409, 'NOT_DELETABLE');
  }

  assertWithinCorrectionWindow(transaction);
  await transaction.deleteOne();
  emitToRoom(transaction.roomId.toString(), 'transaction:deleted', {
    transactionId: transaction._id.toString(),
  });
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

  emitToRoom(transaction.roomId.toString(), 'transaction:updated', { transaction });

  return transaction;
}
