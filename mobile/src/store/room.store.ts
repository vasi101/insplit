import { create } from 'zustand';
import { Room, RoomMember } from '../types';
import * as roomsApi from '../services/api/rooms.api';
import { extractErrorMessage } from '../services/api/client';
import { saveCurrentRoomId, getCurrentRoomId } from '../utils/storage';
import { joinSocketRoom, leaveSocketRoom } from '../services/socket/socket.service';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  members: RoomMember[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRooms: () => Promise<void>;
  selectRoom: (roomId: string) => Promise<void>;
  createRoom: (payload: roomsApi.CreateRoomPayload) => Promise<Room>;
  joinRoom: (inviteCode: string) => Promise<Room>;
  leaveRoom: (roomId: string) => Promise<void>;
  regenerateInviteCode: (roomId: string) => Promise<string>;
  fetchMembers: (roomId: string) => Promise<void>;
  clearError: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: [],
  currentRoom: null,
  members: [],
  isLoading: false,
  error: null,

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await roomsApi.getUserRooms();
      const savedRoomId = await getCurrentRoomId();

      let activeRoom: Room | null = null;
      if (rooms.length > 0) {
        if (savedRoomId) {
          activeRoom = rooms.find((r) => r._id === savedRoomId) || rooms[0];
        } else {
          activeRoom = rooms[0];
        }
      }

      set({ rooms, currentRoom: activeRoom, isLoading: false });

      if (activeRoom) {
        await saveCurrentRoomId(activeRoom._id);
        joinSocketRoom(activeRoom._id);
        get().fetchMembers(activeRoom._id);
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
    }
  },

  selectRoom: async (roomId: string) => {
    const { currentRoom, rooms } = get();
    if (currentRoom) {
      leaveSocketRoom(currentRoom._id);
    }

    const room = rooms.find((r) => r._id === roomId);
    if (room) {
      set({ currentRoom: room });
      await saveCurrentRoomId(room._id);
      joinSocketRoom(room._id);
      get().fetchMembers(room._id);
    } else {
      try {
        const fullRoom = await roomsApi.getRoomById(roomId);
        set({ currentRoom: fullRoom });
        await saveCurrentRoomId(fullRoom._id);
        joinSocketRoom(fullRoom._id);
        get().fetchMembers(fullRoom._id);
      } catch (err) {
        set({ error: extractErrorMessage(err) });
      }
    }
  },

  createRoom: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const room = await roomsApi.createRoom(payload);
      const { rooms } = get();
      set({ rooms: [room, ...rooms], currentRoom: room, isLoading: false });
      await saveCurrentRoomId(room._id);
      joinSocketRoom(room._id);
      void get().fetchMembers(room._id);
      return room;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  joinRoom: async (inviteCode) => {
    set({ isLoading: true, error: null });
    try {
      const room = await roomsApi.joinRoom(inviteCode);
      const { rooms } = get();
      set({ rooms: [room, ...rooms], currentRoom: room, isLoading: false });
      await saveCurrentRoomId(room._id);
      joinSocketRoom(room._id);
      void get().fetchMembers(room._id);
      return room;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  leaveRoom: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      await roomsApi.leaveRoom(roomId);
      leaveSocketRoom(roomId);
      const { rooms } = get();
      const updatedRooms = rooms.filter((r) => r._id !== roomId);
      const newActive = updatedRooms.length > 0 ? updatedRooms[0] : null;
      set({ rooms: updatedRooms, currentRoom: newActive, isLoading: false });
      if (newActive) {
        await saveCurrentRoomId(newActive._id);
        joinSocketRoom(newActive._id);
      }
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  regenerateInviteCode: async (roomId) => {
    try {
      const newCode = await roomsApi.regenerateInviteCode(roomId);
      const { currentRoom, rooms } = get();
      if (currentRoom && currentRoom._id === roomId) {
        set({ currentRoom: { ...currentRoom, inviteCode: newCode } });
      }
      set({
        rooms: rooms.map((r) => (r._id === roomId ? { ...r, inviteCode: newCode } : r)),
      });
      return newCode;
    } catch (err) {
      const message = extractErrorMessage(err);
      set({ error: message });
      throw new Error(message);
    }
  },

  fetchMembers: async (roomId) => {
    try {
      const members = await roomsApi.getRoomMembers(roomId);
      set({ members });
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  },

  clearError: () => set({ error: null }),
}));
