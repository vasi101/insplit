import mongoose from 'mongoose';
import { Transaction } from '../transactions/transaction.model';
import { Settlement, ISettlement, PaymentMethod } from './settlement.model';
import { Room } from '../rooms/room.model';
import { createError } from '../../middleware/error.middleware';
import { getSocketServer } from '../../sockets/socket.server';

export interface MemberBalance {
  userId: string;
  name: string;
  email: string;
  profileImage?: string;
  totalPaid: number;
  fairShare: number;
  balance: number; // positive = owed money, negative = owes money
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

function memberUserId(value: unknown): string {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value ?? '');
}

// Calculate who owes whom based on verified transactions only (Rules 4 & 5)
export async function calculateBalances(
  roomId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{ balances: MemberBalance[]; suggestions: SettlementSuggestion[]; currency: string }> {
  const room = await Room.findById(roomId).populate('members.userId', 'name email profileImage');
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  const isMember = room.members.some((m) => memberUserId(m.userId) === userId && m.status === 'ACTIVE');
  if (!isMember) throw createError('Not a room member', 403, 'NOT_MEMBER');

  const activeMembers = room.members.filter((m) => m.status === 'ACTIVE' && memberUserId(m.userId));

  // Only VERIFIED transactions (Rules 4, 5, 6)
  const filter: Record<string, unknown> = { roomId, status: 'VERIFIED' };
  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) (filter.expenseDate as Record<string, Date>).$gte = startDate;
    if (endDate) (filter.expenseDate as Record<string, Date>).$lte = endDate;
  }

  const transactions = await Transaction.find(filter);

  const totalExpense = transactions.reduce((sum, t) => sum + t.amount, 0);
  const fairSharePerMember = totalExpense / activeMembers.length;

  // Build contribution map
  const paidMap: Record<string, number> = {};
  for (const member of activeMembers) {
    paidMap[memberUserId(member.userId)] = 0;
  }
  for (const tx of transactions) {
    const paidById = tx.paidBy.toString();
    if (paidMap[paidById] !== undefined) {
      paidMap[paidById] += tx.amount;
    }
  }

  // Keep actual spending separate from the settlement-adjusted contribution.
  // A settlement changes what remains owed, but must not change totalPaid.
  const effectiveContribution = { ...paidMap };
  // Legacy settlements without a status were already settled; new records must be verified.
  const settlementFilter: Record<string, unknown> = { roomId, status: { $in: ['VERIFIED', null] } };
  if (startDate || endDate) {
    settlementFilter.settlementDate = {};
    if (startDate) (settlementFilter.settlementDate as Record<string, Date>).$gte = startDate;
    if (endDate) (settlementFilter.settlementDate as Record<string, Date>).$lte = endDate;
  }
  const settlements = await Settlement.find(settlementFilter);
  for (const s of settlements) {
    const from = s.fromUser.toString();
    const to = s.toUser.toString();
    // fromUser paid toUser, so fromUser's effective contribution increases
    if (effectiveContribution[from] !== undefined) effectiveContribution[from] += s.amount;
    if (effectiveContribution[to] !== undefined) effectiveContribution[to] -= s.amount;
  }

  const balances: MemberBalance[] = activeMembers.map((member) => {
    const userObj = member.userId as unknown as { _id: mongoose.Types.ObjectId; name: string; email: string; profileImage?: string };
    const memberId = memberUserId(member.userId);
    const paid = paidMap[memberId] ?? 0;
    const rawBalance = (effectiveContribution[memberId] ?? 0) - fairSharePerMember;
    const balance = Math.abs(rawBalance) < 0.01 ? 0 : Math.round(rawBalance * 100) / 100;
    return {
      userId: memberId,
      name: userObj.name ?? 'Unknown',
      email: userObj.email ?? '',
      profileImage: userObj.profileImage,
      totalPaid: paid,
      fairShare: fairSharePerMember,
      balance,
    };
  });

  // Generate minimal settlement suggestions
  const suggestions = generateSettlementSuggestions(balances);

  return { balances, suggestions, currency: 'NPR' };
}

function generateSettlementSuggestions(balances: MemberBalance[]): SettlementSuggestion[] {
  const suggestions: SettlementSuggestion[] = [];

  // Sort: creditors (positive balance) and debtors (negative balance)
  const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

  let i = 0, j = 0;
  const creditArr = creditors.map((c) => ({ ...c, remaining: c.balance }));
  const debtArr = debtors.map((d) => ({ ...d, remaining: Math.abs(d.balance) }));

  while (i < creditArr.length && j < debtArr.length) {
    const amount = Math.min(creditArr[i].remaining, debtArr[j].remaining);
    if (amount > 0.01) {
      suggestions.push({
        fromUserId: debtArr[j].userId,
        fromUserName: debtArr[j].name,
        toUserId: creditArr[i].userId,
        toUserName: creditArr[i].name,
        amount: Math.round(amount * 100) / 100,
        currency: 'NPR',
      });
    }
    creditArr[i].remaining -= amount;
    debtArr[j].remaining -= amount;
    if (creditArr[i].remaining < 0.01) i++;
    if (debtArr[j].remaining < 0.01) j++;
  }

  return suggestions;
}

export interface RecordSettlementInput {
  roomId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  currency?: string;
  settlementDate: string | Date;
  method?: PaymentMethod;
  note?: string;
  proofImage?: string;
  createdBy: string;
}

export async function recordSettlement(input: RecordSettlementInput): Promise<ISettlement> {
  const room = await Room.findById(input.roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  const isMember = room.members.some((m) => m.userId.toString() === input.createdBy && m.status === 'ACTIVE');
  if (!isMember) throw createError('Not a room member', 403, 'NOT_MEMBER');

  const settlement = await Settlement.create({
    roomId: input.roomId,
    fromUser: input.fromUser,
    toUser: input.toUser,
    amount: input.amount,
    currency: input.currency ?? 'NPR',
    settlementDate: new Date(input.settlementDate),
    method: input.method ?? 'CASH',
    note: input.note,
    proofImage: input.proofImage,
    status: 'PENDING',
    createdBy: input.createdBy,
  });

  const populated = await settlement.populate([
    { path: 'fromUser', select: 'name email profileImage' },
    { path: 'toUser', select: 'name email profileImage' },
  ]);

  const io = getSocketServer();
  if (io) {
    io.to(`room:${input.roomId}`).emit('settlement:created', { settlement: populated });
  }

  return populated;
}

export async function verifySettlement(settlementId: string, userId: string, approved: boolean): Promise<ISettlement> {
  const settlement = await Settlement.findById(settlementId);
  if (!settlement) throw createError('Settlement not found', 404, 'NOT_FOUND');
  if (settlement.status !== 'PENDING') throw createError('Settlement has already been reviewed', 409, 'ALREADY_REVIEWED');
  if (settlement.toUser.toString() !== userId) {
    throw createError('Only the payment receiver can verify this settlement', 403, 'NOT_RECEIVER');
  }

  settlement.status = approved ? 'VERIFIED' : 'REJECTED';
  settlement.verification = {
    verifiedBy: new mongoose.Types.ObjectId(userId),
    decision: approved ? 'APPROVED' : 'REJECTED',
    verifiedAt: new Date(),
  };
  await settlement.save();
  await settlement.populate([
    { path: 'fromUser', select: 'name email profileImage' },
    { path: 'toUser', select: 'name email profileImage' },
    { path: 'verification.verifiedBy', select: 'name email profileImage' },
  ]);

  const io = getSocketServer();
  if (io) io.to(`room:${settlement.roomId}`).emit('settlement:updated', { settlement });
  return settlement;
}

export async function getSettlementHistory(roomId: string, userId: string): Promise<ISettlement[]> {
  const room = await Room.findById(roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  const isMember = room.members.some((m) => m.userId.toString() === userId && m.status === 'ACTIVE');
  if (!isMember) throw createError('Not a room member', 403, 'NOT_MEMBER');

  return Settlement.find({ roomId })
    .populate('fromUser', 'name email profileImage')
    .populate('toUser', 'name email profileImage')
    .sort({ createdAt: -1 });
}
