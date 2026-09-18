import { create } from 'zustand';
import { InventoryItem } from '../types';
import * as inventoryApi from '../services/api/inventory.api';
import { extractErrorMessage } from '../services/api/client';
import { registerSocketHandlers } from '../services/socket/socket.service';
import { useRoomStore } from './room.store';
import { useAuthStore } from './auth.store';

interface InventoryState {
  roomId: string | null;
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  setRoom: (roomId: string | null) => void;
  fetchItems: (roomId: string) => Promise<void>;
  addItem: (payload: inventoryApi.AddItemPayload) => Promise<InventoryItem>;
  updateItem: (itemId: string, payload: inventoryApi.UpdateItemPayload) => Promise<InventoryItem>;
  deleteItem: (itemId: string) => Promise<void>;
  approveItem: (itemId: string) => Promise<InventoryItem>;
  rejectItem: (itemId: string, reason?: string) => Promise<InventoryItem>;
  updateItemLocally: (item: InventoryItem) => void;
  removeItemLocally: (itemId: string) => void;
  clearError: () => void;
}

// Do not rehydrate the old unscoped inventory cache across rooms or accounts.
export const useInventoryStore = create<InventoryState>((set, get) => {
  let generation = 0;
  let requestId = 0;
  const requireItem = (itemId: string) => {
    if (!get().items.some(item => item._id === itemId && item.roomId === get().roomId)) {
      throw new Error('This item is not in the selected room. Refresh inventory.');
    }
  };
  const mutate = async <T,>(action: () => Promise<T>, apply: (value: T) => void): Promise<T> => {
    const started = generation;
    try {
      const result = await action();
      if (started === generation) apply(result);
      return result;
    } catch (err) {
      const message = extractErrorMessage(err);
      if (started === generation) set({ error: message });
      throw new Error(message);
    }
  };

  registerSocketHandlers({
    onInventoryCreated: item => get().updateItemLocally(item),
    onInventoryUpdated: item => get().updateItemLocally(item),
    onInventoryDeleted: itemId => get().removeItemLocally(itemId),
  });

  return {
    roomId: null,
    items: [],
    isLoading: false,
    error: null,
    setRoom: roomId => {
      generation += 1;
      requestId += 1;
      set({ roomId, items: [], isLoading: false, error: null });
    },
    fetchItems: async roomId => {
      if (!useAuthStore.getState().isAuthenticated || useRoomStore.getState().currentRoom?._id !== roomId) return;
      if (get().roomId !== roomId) get().setRoom(roomId);
      const request = ++requestId;
      set({ isLoading: true, error: null });
      try {
        const items = await inventoryApi.getItemsByRoom(roomId);
        if (request !== requestId) return;
        set({ items: items.filter(item => item.roomId === roomId && item.isActive), isLoading: false });
      } catch (err) {
        if (request === requestId) set({ error: extractErrorMessage(err), isLoading: false });
      }
    },
    addItem: async payload => {
      if (!get().roomId || payload.roomId !== get().roomId) throw new Error('Select the correct room before adding inventory.');
      return mutate(() => inventoryApi.addItem(payload), item => get().updateItemLocally(item));
    },
    updateItem: async (itemId, payload) => {
      requireItem(itemId);
      return mutate(() => inventoryApi.updateItem(itemId, payload), item => get().updateItemLocally(item));
    },
    deleteItem: async itemId => {
      requireItem(itemId);
      return mutate(() => inventoryApi.deleteItem(itemId), () => get().removeItemLocally(itemId));
    },
    approveItem: async itemId => {
      requireItem(itemId);
      return mutate(() => inventoryApi.approveItem(itemId), item => get().updateItemLocally(item));
    },
    rejectItem: async (itemId, reason) => {
      requireItem(itemId);
      return mutate(() => inventoryApi.rejectItem(itemId, reason), item => get().updateItemLocally(item));
    },
    updateItemLocally: item => {
      if (!get().roomId || item.roomId !== get().roomId) return;
      if (!item.isActive) { get().removeItemLocally(item._id); return; }
      set(state => ({ items: [...state.items.filter(existing => existing._id !== item._id), item] }));
    },
    removeItemLocally: itemId => set(state => ({ items: state.items.filter(item => item._id !== itemId) })),
    clearError: () => set({ error: null }),
  };
});

// Clear synchronously on room/account changes, before a screen starts its next fetch.
useRoomStore.subscribe((state, previous) => {
  if (state.currentRoom?._id !== previous.currentRoom?._id) {
    useInventoryStore.getState().setRoom(useAuthStore.getState().isAuthenticated ? state.currentRoom?._id ?? null : null);
  }
});
useAuthStore.subscribe((state, previous) => {
  if (state.user?._id !== previous.user?._id || state.isAuthenticated !== previous.isAuthenticated) {
    useInventoryStore.getState().setRoom(null);
  }
});
