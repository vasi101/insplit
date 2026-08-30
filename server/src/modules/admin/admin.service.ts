import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../auth/auth.model';
import { Room } from '../rooms/room.model';
import { Transaction, TransactionCategory, TransactionStatus } from '../transactions/transaction.model';
import { InventoryItem, InventoryCategory, InventoryUnit } from '../inventory/inventory.model';
import { Settlement } from '../settlements/settlement.model';
import { createError } from '../../middleware/error.middleware';
import { sendCodeEmail } from '../../notifications/email.service';
import { emitToRoom, emitToAdmin, emitGlobal } from '../../sockets/socket.server';
import { serverCache } from '../../utils/cache';

const SALT_ROUNDS = 12;

// ─── Analytics & Dashboard Stats ──────────────────────────────────────────────

export async function getDashboardStats() {
  return serverCache.getOrSet('admin:dashboard:stats', async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 1. Overview counts
  const [
    totalUsers,
    verifiedUsers,
    adminUsers,
    newUsers30d,
    totalRooms,
    newRooms30d,
    totalInventory,
    lowStockItems,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ emailVerified: true }),
    User.countDocuments({ isAdmin: true }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    Room.countDocuments(),
    Room.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    InventoryItem.countDocuments({ isActive: true }),
    InventoryItem.countDocuments({
      isActive: true,
      minQuantity: { $exists: true, $ne: null },
      $expr: { $lte: ['$quantity', '$minQuantity'] },
    }),
  ]);

  // 2. Transaction aggregations
  const transactionStats = await Transaction.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
  ]);

  let totalTransactions = 0;
  let totalVolumeNPR = 0;
  let verifiedVolumeNPR = 0;
  const statusBreakdown: Record<string, { count: number; totalAmount: number }> = {
    PENDING: { count: 0, totalAmount: 0 },
    VERIFIED: { count: 0, totalAmount: 0 },
    REJECTED: { count: 0, totalAmount: 0 },
    VOIDED: { count: 0, totalAmount: 0 },
  };

  for (const s of transactionStats) {
    if (s._id && statusBreakdown[s._id]) {
      statusBreakdown[s._id] = { count: s.count, totalAmount: s.totalAmount };
    }
    totalTransactions += s.count;
    totalVolumeNPR += s.totalAmount;
    if (s._id === 'VERIFIED') {
      verifiedVolumeNPR += s.totalAmount;
    }
  }

  // 3. Category Breakdown
  const categoryStats = await Transaction.aggregate([
    { $match: { status: { $ne: 'VOIDED' } } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  // 4. Monthly trends (last 6 months)
  const monthlyTransactions = await Transaction.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        status: { $ne: 'VOIDED' },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        volume: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const monthlyUsers = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  // 5. Recent items
  const [recentTransactions, recentUsers, recentRooms] = await Promise.all([
    Transaction.find()
      .populate('createdBy', 'name email profileImage')
      .populate('paidBy', 'name email profileImage')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    User.find()
      .select('name email profileImage emailVerified isAdmin createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Room.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  return {
    overview: {
      totalUsers,
      verifiedUsers,
      adminUsers,
      newUsers30d,
      totalRooms,
      newRooms30d,
      totalTransactions,
      totalVolumeNPR,
      verifiedVolumeNPR,
      totalInventory,
      lowStockItems,
    },
    statusBreakdown,
    categoryBreakdown: categoryStats.map((c) => ({
      category: c._id || 'OTHER',
      count: c.count,
      totalAmount: c.totalAmount,
    })),
    monthlyTrends: {
      transactions: monthlyTransactions.map((m) => ({
        year: m._id.year,
        month: m._id.month,
        volume: m.volume,
        count: m.count,
      })),
      users: monthlyUsers.map((u) => ({
        year: u._id.year,
        month: u._id.month,
        count: u.count,
      })),
    },
    recent: {
      transactions: recentTransactions,
      users: recentUsers,
      rooms: recentRooms,
    },
  };
  }, 60);
}

// ─── User Management ──────────────────────────────────────────────────────────

export interface ListUsersParams {
  search?: string;
  role?: 'admin' | 'user' | 'all';
  verified?: 'true' | 'false' | 'all';
  page?: number;
  limit?: number;
}

export interface AdminUserListItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
  roomsCount: number;
}

export interface GetAllUsersResult {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pages: number;
}

export async function getAllUsers(params: ListUsersParams): Promise<GetAllUsersResult> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
    ];
  }

  if (params.role === 'admin') filter.isAdmin = true;
  if (params.role === 'user') filter.isAdmin = { $ne: true };

  if (params.verified === 'true') filter.emailVerified = true;
  if (params.verified === 'false') filter.emailVerified = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('name email phone profileImage emailVerified isAdmin createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  // Enrich with room counts
  const userIds = users.map((u) => u._id);
  const roomCounts = await Room.aggregate([
    { $unwind: '$members' },
    { $match: { 'members.userId': { $in: userIds }, 'members.status': 'ACTIVE' } },
    { $group: { _id: '$members.userId', count: { $sum: 1 } } },
  ]);

  const roomCountMap = new Map<string, number>();
  for (const rc of roomCounts) {
    roomCountMap.set(rc._id.toString(), rc.count);
  }

  const enrichedUsers: AdminUserListItem[] = users.map((u: any) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    profileImage: u.profileImage,
    emailVerified: u.emailVerified,
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    roomsCount: roomCountMap.get(u._id.toString()) || 0,
  }));

  return {
    users: enrichedUsers,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getUserDetails(userId: string) {
  const user = await User.findById(userId)
    .select('name email phone profileImage emailVerified isAdmin createdAt updatedAt')
    .lean();

  if (!user) throw createError('User not found', 404, 'NOT_FOUND');

  const [rooms, transactionsCount, totalSpentResult] = await Promise.all([
    Room.find({ 'members.userId': new mongoose.Types.ObjectId(userId) })
      .select('name description inviteCode members createdAt')
      .lean(),
    Transaction.countDocuments({ createdBy: new mongoose.Types.ObjectId(userId) }),
    Transaction.aggregate([
      {
        $match: {
          paidBy: new mongoose.Types.ObjectId(userId),
          status: 'VERIFIED',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    user,
    rooms,
    stats: {
      transactionsCount,
      totalSpent: totalSpentResult[0]?.total || 0,
    },
  };
}

export async function createUser(payload: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
}) {
  const existing = await User.findOne({ email: payload.email.toLowerCase().trim() });
  if (existing) throw createError('Email is already registered', 409, 'EMAIL_EXISTS');

  const rawPassword = payload.password || 'Insplit@123';
  const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  const user = await User.create({
    name: payload.name.trim(),
    email: payload.email.toLowerCase().trim(),
    passwordHash,
    phone: payload.phone?.trim() || null,
    isAdmin: !!payload.isAdmin,
    emailVerified: payload.emailVerified !== undefined ? payload.emailVerified : true,
  });

  serverCache.delPattern('admin:');
  emitToAdmin('user:created', { user });
  return user;
}

export async function updateUser(
  userId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    isAdmin?: boolean;
    emailVerified?: boolean;
    password?: string;
  }
) {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');

  if (payload.name !== undefined) user.name = payload.name.trim();
  if (payload.email !== undefined) {
    const normalized = payload.email.toLowerCase().trim();
    if (normalized !== user.email) {
      const exists = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (exists) throw createError('Email already in use', 409, 'EMAIL_EXISTS');
      user.email = normalized;
    }
  }
  if (payload.phone !== undefined) user.phone = payload.phone.trim();
  if (payload.isAdmin !== undefined) user.isAdmin = payload.isAdmin;
  if (payload.emailVerified !== undefined) user.emailVerified = payload.emailVerified;
  if (payload.password && payload.password.length >= 8) {
    user.passwordHash = await bcrypt.hash(payload.password, SALT_ROUNDS);
  }

  await user.save();
  serverCache.delPattern('admin:');
  emitToAdmin('user:updated', { user });
  return user;
}

export async function deleteUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');

  // Remove from all rooms
  await Room.updateMany(
    { 'members.userId': user._id },
    { $pull: { members: { userId: user._id } } }
  );

  await User.findByIdAndDelete(userId);
  serverCache.delPattern('admin:');
  emitToAdmin('user:deleted', { userId });
  return { success: true };
}

export async function setUserAdminRole(userId: string, isAdmin: boolean) {
  const user = await User.findByIdAndUpdate(userId, { isAdmin }, { new: true });
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');
  serverCache.delPattern('admin:');
  emitToAdmin('user:updated', { user });
  return user;
}

export async function sendUserVerificationEmail(userId: string) {
  const user = await User.findById(userId).select('+emailVerificationCodeHash +emailVerificationExpiresAt');
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');

  user.emailVerified = false;
  user.emailVerificationCodeHash = codeHash;
  user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendCodeEmail({
    to: user.email,
    subject: 'Verify your Insplit email',
    heading: 'Verify your email address',
    message: 'An administrator triggered a verification code for your Insplit account:',
    code,
  });

  serverCache.delPattern('admin:');
  emitToAdmin('user:updated', { user });
  return { success: true, email: user.email };
}

export async function toggleUserVerification(userId: string, emailVerified: boolean) {
  const user = await User.findByIdAndUpdate(userId, { emailVerified }, { new: true });
  if (!user) throw createError('User not found', 404, 'NOT_FOUND');
  serverCache.delPattern('admin:');
  emitToAdmin('user:updated', { user });
  return user;
}

// ─── Transaction Management ───────────────────────────────────────────────────

export interface ListAdminTransactionsParams {
  search?: string;
  roomId?: string;
  status?: TransactionStatus | 'ALL';
  category?: TransactionCategory | 'ALL';
  page?: number;
  limit?: number;
}

export async function getAllTransactions(params: ListAdminTransactionsParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (params.roomId && mongoose.Types.ObjectId.isValid(params.roomId)) {
    filter.roomId = new mongoose.Types.ObjectId(params.roomId);
  }

  if (params.status && params.status !== 'ALL') {
    filter.status = params.status;
  }

  if (params.category && params.category !== 'ALL') {
    filter.category = params.category;
  }

  if (params.search && params.search.trim()) {
    filter.$or = [
      { title: { $regex: params.search.trim(), $options: 'i' } },
      { description: { $regex: params.search.trim(), $options: 'i' } },
    ];
  }

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('roomId', 'name')
      .populate('createdBy', 'name email profileImage')
      .populate('paidBy', 'name email profileImage')
      .populate('verification.verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return {
    transactions,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function createTransactionAdmin(payload: {
  roomId: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  category?: TransactionCategory;
  paidBy: string;
  createdBy: string;
  status?: TransactionStatus;
  expenseDate?: string;
}) {
  const room = await Room.findById(payload.roomId);
  if (!room) throw createError('Room not found', 404, 'NOT_FOUND');

  const transaction = await Transaction.create({
    roomId: payload.roomId,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency || 'NPR',
    category: payload.category || 'OTHER',
    paidBy: payload.paidBy,
    createdBy: payload.createdBy,
    status: payload.status || 'VERIFIED',
    expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
    images: [],
  });

  const populated = await transaction.populate([
    { path: 'roomId', select: 'name' },
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
  ]);

  emitToRoom(payload.roomId, 'transaction:created', { transaction: populated });
  serverCache.delPattern('admin:');
  return populated;
}

export async function deleteTransaction(transactionId: string) {
  const tx = await Transaction.findByIdAndDelete(transactionId);
  if (!tx) throw createError('Transaction not found', 404, 'NOT_FOUND');
  emitToRoom(tx.roomId.toString(), 'transaction:deleted', { transactionId });
  serverCache.delPattern('admin:');
  return { success: true };
}

export async function updateTransactionStatusAdmin(transactionId: string, status: TransactionStatus) {
  const tx = await Transaction.findByIdAndUpdate(
    transactionId,
    { status },
    { new: true }
  ).populate([
    { path: 'roomId', select: 'name' },
    { path: 'createdBy', select: 'name email profileImage' },
    { path: 'paidBy', select: 'name email profileImage' },
  ]);

  if (!tx) throw createError('Transaction not found', 404, 'NOT_FOUND');
  emitToRoom(tx.roomId.toString(), 'transaction:updated', { transaction: tx });
  serverCache.delPattern('admin:');
  return tx;
}

// ─── Room Management ──────────────────────────────────────────────────────────

export async function getAllRooms(params: { search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (params.search && params.search.trim()) {
    filter.name = { $regex: params.search.trim(), $options: 'i' };
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .populate('createdBy', 'name email profileImage')
      .populate('members.userId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Room.countDocuments(filter),
  ]);

  return {
    rooms,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function createRoomAdmin(payload: { name: string; description?: string; creatorId: string }) {
  const user = await User.findById(payload.creatorId);
  if (!user) throw createError('Creator user not found', 404, 'NOT_FOUND');

  // Generate 6-char unique invite code
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const room = await Room.create({
    name: payload.name.trim(),
    description: payload.description?.trim(),
    createdBy: user._id,
    inviteCode,
    members: [
      {
        userId: user._id,
        role: 'OWNER',
        joinedAt: new Date(),
        status: 'ACTIVE',
      },
    ],
  });

  const populated = await room.populate('createdBy', 'name email');
  emitToAdmin('room:created', { room: populated });
  serverCache.delPattern('admin:');
  return populated;
}

export async function deleteRoom(roomId: string) {
  const room = await Room.findByIdAndDelete(roomId);
  if (!room) throw createError('Room not found', 404, 'NOT_FOUND');

  // Cascade delete transactions and inventory
  await Promise.all([
    Transaction.deleteMany({ roomId }),
    InventoryItem.deleteMany({ roomId }),
    Settlement.deleteMany({ roomId }),
  ]);

  emitToAdmin('room:deleted', { roomId });
  serverCache.delPattern('admin:');
  return { success: true };
}

// ─── Inventory Management ─────────────────────────────────────────────────────

export async function getAllInventory(params: {
  roomId?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 30));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { isActive: true };

  if (params.roomId && mongoose.Types.ObjectId.isValid(params.roomId)) {
    filter.roomId = new mongoose.Types.ObjectId(params.roomId);
  }

  if (params.category && params.category !== 'ALL') {
    filter.category = params.category;
  }

  if (params.search && params.search.trim()) {
    filter.name = { $regex: params.search.trim(), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate('roomId', 'name')
      .populate('addedBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .sort({ category: 1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function addInventoryItemAdmin(
  userId: string,
  payload: {
    roomId: string;
    name: string;
    category?: InventoryCategory;
    quantity: number;
    unit?: InventoryUnit;
    minQuantity?: number;
  }
) {
  const item = await InventoryItem.create({
    roomId: new mongoose.Types.ObjectId(payload.roomId),
    name: payload.name.trim(),
    category: payload.category || 'OTHER',
    quantity: payload.quantity,
    unit: payload.unit || 'pcs',
    minQuantity: payload.minQuantity,
    addedBy: new mongoose.Types.ObjectId(userId),
    lastUpdatedBy: new mongoose.Types.ObjectId(userId),
  });

  const populated = await item.populate([
    { path: 'roomId', select: 'name' },
    { path: 'addedBy', select: 'name email' },
    { path: 'lastUpdatedBy', select: 'name email' },
  ]);

  emitToRoom(payload.roomId, 'inventory:created', { item: populated });
  serverCache.delPattern('admin:');
  return populated;
}

export async function updateInventoryItemAdmin(
  itemId: string,
  userId: string,
  payload: {
    name?: string;
    category?: InventoryCategory;
    quantity?: number;
    unit?: InventoryUnit;
    minQuantity?: number | null;
  }
) {
  const update: Record<string, unknown> = { lastUpdatedBy: new mongoose.Types.ObjectId(userId) };
  if (payload.name !== undefined) update.name = payload.name.trim();
  if (payload.category !== undefined) update.category = payload.category;
  if (payload.quantity !== undefined) update.quantity = payload.quantity;
  if (payload.unit !== undefined) update.unit = payload.unit;
  if (payload.minQuantity !== undefined) update.minQuantity = payload.minQuantity === null ? undefined : payload.minQuantity;

  const item = await InventoryItem.findByIdAndUpdate(
    itemId,
    { $set: update },
    { new: true, runValidators: true }
  ).populate([
    { path: 'roomId', select: 'name' },
    { path: 'addedBy', select: 'name email' },
    { path: 'lastUpdatedBy', select: 'name email' },
  ]);

  if (!item) throw createError('Inventory item not found', 404, 'NOT_FOUND');
  emitToRoom(item.roomId.toString(), 'inventory:updated', { item });
  serverCache.delPattern('admin:');
  return item;
}

export async function deleteInventoryItemAdmin(itemId: string) {
  const item = await InventoryItem.findByIdAndDelete(itemId);
  if (!item) throw createError('Inventory item not found', 404, 'NOT_FOUND');
  emitToRoom(item.roomId.toString(), 'inventory:deleted', { itemId: item._id.toString() });
  serverCache.delPattern('admin:');
  return { success: true };
}
