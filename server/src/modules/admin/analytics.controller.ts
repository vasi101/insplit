import { Request, Response, NextFunction } from 'express';
import mongoose, { PipelineStage } from 'mongoose';
import { Transaction } from '../transactions/transaction.model';
import { Settlement } from '../settlements/settlement.model';
import { InventoryItem } from '../inventory/inventory.model';
import { Room } from '../rooms/room.model';
import { User } from '../auth/auth.model';
import { createError } from '../../middleware/error.middleware';
import { successResponse } from '../../utils/response';

export function analyticsFilters(query: Record<string, unknown>) {
  const from = new Date(String(query.from ?? ''));
  const to = new Date(String(query.to ?? ''));
  const group = String(query.group ?? 'day');
  const timezone = String(query.timezone ?? 'UTC');
  const currency = String(query.currency ?? 'NPR');
  const status = String(query.status ?? 'ALL');
  const category = String(query.category ?? 'ALL');
  const page = Number(query.page ?? 1);
  if (!Number.isFinite(+from) || !Number.isFinite(+to) || from >= to || +to - +from > 3660 * 86400000) throw createError('Choose a valid date range of up to 10 years.', 400);
  if (!['day', 'week', 'month', 'year'].includes(group)) throw createError('Invalid grouping.', 400);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw createError('Invalid page.', 400);
  if (!/^[A-Z]{3,10}$/.test(currency)) throw createError('Invalid currency.', 400);
  if (!['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'VOIDED'].includes(status)) throw createError('Invalid status.', 400);
  if (!['ALL', 'GROCERY', 'UTILITIES', 'RENT', 'CLEANING', 'FOOD', 'TRANSPORT', 'MEDICAL', 'ENTERTAINMENT', 'OTHER'].includes(category)) throw createError('Invalid category.', 400);
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { throw createError('Invalid timezone.', 400); }
  const roomId = query.roomId ? String(query.roomId) : '';
  if (roomId && !mongoose.isValidObjectId(roomId)) throw createError('Invalid room.', 400);
  return { from, to, group, timezone, currency, status, category, page, roomId };
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const f = analyticsFilters(req.query);
    const roomMatch = f.roomId ? { roomId: new mongoose.Types.ObjectId(f.roomId) } : {};
    const dateMatch = { $gte: f.from, $lt: f.to };
    const moneyMatch = { ...roomMatch, currency: f.currency };
    const transactionMatch = { ...moneyMatch, expenseDate: dateMatch, ...(f.status !== 'ALL' ? { status: f.status } : {}), ...(f.category !== 'ALL' ? { category: f.category } : {}) };
    const format = { day: '%Y-%m-%d', week: '%G-W%V', month: '%Y-%m', year: '%Y' }[f.group]!;
    const bucket = (field: string) => ({ $dateToString: { date: `$${field}`, format, timezone: f.timezone } });
    const moneyGroup = (id: unknown): PipelineStage.Group => ({ $group: { _id: id, count: { $sum: 1 }, amount: { $sum: '$amount' }, verified: { $sum: { $cond: [{ $eq: ['$status', 'VERIFIED'] }, '$amount', 0] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] } }, average: { $avg: '$amount' }, largest: { $max: '$amount' } } });
    const named = (field: string, collection: string): PipelineStage.FacetPipelineStage[] => [moneyGroup(`$${field}`), { $lookup: { from: collection, localField: '_id', foreignField: '_id', as: 'entity' } }, { $set: { name: { $ifNull: [{ $arrayElemAt: ['$entity.name', 0] }, 'Deleted record'] } } }, { $unset: 'entity' }, { $sort: { amount: -1 } }];
    const rooms = await Room.find({}).select('name members createdAt').lean();
    const selectedRooms = rooms.filter(room => !f.roomId || room._id.toString() === f.roomId);
    const memberIds = selectedRooms.flatMap(room => room.members.filter(member => member.status === 'ACTIVE').map(member => member.userId));
    const [transactions, settlements, inventory, users, currencies] = await Promise.all([
      Transaction.aggregate([{ $match: transactionMatch }, { $facet: {
        summary: [moneyGroup(null)], trend: [moneyGroup(bucket('expenseDate')), { $sort: { _id: 1 } }],
        categories: [moneyGroup('$category'), { $sort: { amount: -1 } }], statuses: [moneyGroup('$status')],
        rooms: named('roomId', 'rooms'), people: named('paidBy', 'users'),
        details: [{ $sort: { expenseDate: -1, _id: -1 } }, { $skip: (f.page - 1) * 25 }, { $limit: 25 },
          { $lookup: { from: 'rooms', localField: 'roomId', foreignField: '_id', as: 'room' } },
          { $lookup: { from: 'users', localField: 'paidBy', foreignField: '_id', as: 'payer' } },
          { $project: { title: 1, amount: 1, category: 1, status: 1, expenseDate: 1, room: { $arrayElemAt: ['$room.name', 0] }, payer: { $arrayElemAt: ['$payer.name', 0] } } }],
      } }]),
      Settlement.aggregate([{ $match: { ...moneyMatch, settlementDate: dateMatch } }, { $facet: { summary: [moneyGroup(null)], statuses: [moneyGroup('$status')], methods: [moneyGroup('$method')], trend: [moneyGroup(bucket('settlementDate')), { $sort: { _id: 1 } }], rooms: named('roomId', 'rooms') } }]),
      InventoryItem.aggregate([{ $match: { ...roomMatch, createdAt: dateMatch, isActive: true } }, { $facet: {
        statuses: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        items: [{ $group: { _id: { name: { $toLower: { $trim: { input: '$name' } } }, unit: { $cond: [{ $eq: ['$unit', 'g'] }, 'kg', '$unit'] } }, count: { $sum: 1 }, quantity: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 0, { $cond: [{ $eq: ['$unit', 'g'] }, { $divide: ['$quantity', 1000] }, '$quantity'] }] } }, pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } } } }, { $sort: { '_id.name': 1 } }],
        contributors: [{ $group: { _id: '$addedBy', count: { $sum: 1 } } }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }, { $project: { count: 1, name: { $ifNull: [{ $arrayElemAt: ['$user.name', 0] }, 'Former roommate'] } } }, { $sort: { count: -1 } }],
        trend: [{ $group: { _id: bucket('createdAt'), count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
      } }]),
      User.aggregate([{ $match: { createdAt: dateMatch, ...(f.roomId ? { _id: { $in: memberIds } } : {}) } }, { $facet: { summary: [{ $group: { _id: null, count: { $sum: 1 }, verified: { $sum: { $cond: ['$emailVerified', 1, 0] } }, admins: { $sum: { $cond: ['$isAdmin', 1, 0] } } } }], trend: [{ $group: { _id: bucket('createdAt'), count: { $sum: 1 } } }, { $sort: { _id: 1 } }] } }]),
      Promise.all([Transaction.distinct('currency'), Settlement.distinct('currency')]).then(values => values.flat()),
    ]);
    res.json(successResponse({ filters: f, transactions: transactions[0], settlements: settlements[0], inventory: inventory[0], users: users[0],
      currencies: [...new Set(['NPR', ...currencies])].sort(), roomOptions: rooms.map(room => ({ _id: room._id, name: room.name })),
      rooms: selectedRooms.map(room => ({ _id: room._id, name: room.name, activeMembers: room.members.filter(member => member.status === 'ACTIVE').length, pendingMembers: room.members.filter(member => member.status === 'PENDING').length, createdAt: room.createdAt, createdInPeriod: room.createdAt >= f.from && room.createdAt < f.to })),
    }));
  } catch (error) { next(error); }
}
