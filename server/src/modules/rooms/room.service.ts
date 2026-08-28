import mongoose from 'mongoose';
import { Room, IRoom } from './room.model';
import { createError } from '../../middleware/error.middleware';

function generateInviteCode(): string {
  // Format: FLAT-XXXXX (uppercase alphanumeric)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FLAT-${code}`;
}

async function generateUniqueInviteCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  do {
    code = generateInviteCode();
    attempts++;
    if (attempts > 10) throw createError('Could not generate unique invite code', 500);
  } while (await Room.findOne({ inviteCode: code }));
  return code;
}

export interface CreateRoomInput {
  name: string;
  description?: string;
  creatorId: string;
}

export async function createRoom(input: CreateRoomInput): Promise<IRoom> {
  const inviteCode = await generateUniqueInviteCode();

  const room = await Room.create({
    name: input.name.trim(),
    description: input.description?.trim(),
    createdBy: input.creatorId,
    inviteCode,
    members: [
      {
        userId: input.creatorId,
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    ],
  });

  return room;
}

export async function joinRoom(userId: string, inviteCode: string): Promise<IRoom> {
  const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });

  if (!room) {
    throw createError('Invalid invite code', 404, 'ROOM_NOT_FOUND');
  }

  const existingMember = room.members.find(
    (m) => m.userId.toString() === userId && m.status !== 'REMOVED'
  );

  if (existingMember) {
    throw createError('You are already a member of this room', 409, 'ALREADY_MEMBER');
  }

  room.members.push({
    userId: new mongoose.Types.ObjectId(userId),
    role: 'MEMBER',
    status: 'ACTIVE',
    joinedAt: new Date(),
  });

  await room.save();
  return room;
}

export async function getUserRooms(userId: string): Promise<IRoom[]> {
  return Room.find({
    members: {
      $elemMatch: {
        userId: new mongoose.Types.ObjectId(userId),
        status: 'ACTIVE',
      },
    },
  }).populate('members.userId', 'name email profileImage');
}

export async function getRoomById(roomId: string, userId: string): Promise<IRoom> {
  const room = await Room.findById(roomId).populate('members.userId', 'name email profileImage');

  if (!room) {
    throw createError('Room not found', 404, 'ROOM_NOT_FOUND');
  }

  const isMember = room.members.some(
    (m) => m.userId.toString() === userId && m.status === 'ACTIVE'
  );

  if (!isMember) {
    throw createError('You are not a member of this room', 403, 'NOT_MEMBER');
  }

  return room;
}

export async function regenerateInviteCode(roomId: string, userId: string): Promise<string> {
  const room = await Room.findById(roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  const member = room.members.find((m) => m.userId.toString() === userId);
  if (!member || member.role !== 'OWNER') {
    throw createError('Only the room owner can regenerate the invite code', 403, 'FORBIDDEN');
  }

  const newCode = await generateUniqueInviteCode();
  room.inviteCode = newCode;
  await room.save();
  return newCode;
}

export function isRoomMember(room: IRoom, userId: string): boolean {
  return room.members.some(
    (m) => m.userId.toString() === userId && m.status === 'ACTIVE'
  );
}

export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const room = await Room.findById(roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  const member = room.members.find(
    (m) => m.userId.toString() === userId && m.status === 'ACTIVE'
  );
  if (!member) throw createError('You are not an active member of this room', 403, 'NOT_MEMBER');

  if (member.role === 'OWNER') {
    throw createError(
      'Room owner cannot leave. Transfer ownership or delete the room instead.',
      403,
      'OWNER_CANNOT_LEAVE'
    );
  }

  member.status = 'REMOVED';
  await room.save();
}

export async function removeMember(roomId: string, ownerId: string, targetUserId: string): Promise<void> {
  const room = await Room.findById(roomId);
  if (!room) throw createError('Room not found', 404, 'ROOM_NOT_FOUND');

  // Only the owner can remove members
  const ownerMember = room.members.find(
    (m) => m.userId.toString() === ownerId && m.status === 'ACTIVE'
  );
  if (!ownerMember || ownerMember.role !== 'OWNER') {
    throw createError('Only the room owner can remove members', 403, 'FORBIDDEN');
  }

  if (ownerId === targetUserId) {
    throw createError('Owner cannot remove themselves', 400, 'CANNOT_REMOVE_SELF');
  }

  const targetMember = room.members.find(
    (m) => m.userId.toString() === targetUserId && m.status === 'ACTIVE'
  );
  if (!targetMember) {
    throw createError('Member not found in this room', 404, 'MEMBER_NOT_FOUND');
  }

  targetMember.status = 'REMOVED';
  await room.save();
}
