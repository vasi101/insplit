import { apiClient } from './client';
import { Room, RoomMember, ApiResponse } from '../../types';

export interface CreateRoomPayload {
  name: string;
  description?: string;
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  const res = await apiClient.post<ApiResponse<{ room: Room }>>('/rooms', payload);
  return res.data.data!.room;
}

export async function getUserRooms(): Promise<Room[]> {
  const res = await apiClient.get<ApiResponse<{ rooms: Room[] }>>('/rooms');
  return res.data.data!.rooms;
}

export async function getRoomById(roomId: string): Promise<Room> {
  const res = await apiClient.get<ApiResponse<{ room: Room }>>(`/rooms/${roomId}`);
  return res.data.data!.room;
}

export async function joinRoom(inviteCode: string): Promise<Room> {
  const res = await apiClient.post<ApiResponse<{ room: Room }>>('/rooms/join', { inviteCode });
  return res.data.data!.room;
}

export async function getRoomMembers(roomId: string): Promise<RoomMember[]> {
  const res = await apiClient.get<ApiResponse<{ members: RoomMember[] }>>(`/rooms/${roomId}/members`);
  return res.data.data!.members;
}

export async function regenerateInviteCode(roomId: string): Promise<string> {
  const res = await apiClient.post<ApiResponse<{ inviteCode: string }>>(`/rooms/${roomId}/invite`);
  return res.data.data!.inviteCode;
}

export async function leaveRoom(roomId: string): Promise<void> {
  await apiClient.post<ApiResponse<null>>(`/rooms/${roomId}/leave`);
}

export async function removeMember(roomId: string, userId: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/rooms/${roomId}/members/${userId}`);
}
