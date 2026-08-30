import { create } from 'zustand';
import { InventoryItem } from '../types';
import * as inventoryApi from '../services/api/inventory.api';
import { extractErrorMessage } from '../services/api/client';
import { registerSocketHandlers } from '../services/socket/socket.service';

interface InventoryState {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchItems: (roomId: string) => Promise<void>;
  addItem: (payload: inventoryApi.AddItemPayload) => Promise<InventoryItem>;
  updateItem: (itemId: string, payload: inventoryApi.UpdateItemPayload) => Promise<InventoryItem>;
  deleteItem: (itemId: string) => Promise<void>;
  updateItemLocally: (item: InventoryItem) => void;
  removeItemLocally: (itemId: string) => void;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => {
  // Register real-time socket listeners
  registerSocketHandlers({
    onInventoryCreated: (item) => {
      get().updateItemLocally(item);
    },
    onInventoryUpdated: (item) => {
      get().updateItemLocally(item);
    },
    onInventoryDeleted: (itemId) => {
      get().removeItemLocally(itemId);
    },
  });

  return {
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (roomId: string) => {
      set({ isLoading: true, error: null });
      try {
        const items = await inventoryApi.getItemsByRoom(roomId);
        set({ items, isLoading: false });
      } catch (err) {
        set({ error: extractErrorMessage(err), isLoading: false });
      }
    },

    addItem: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const item = await inventoryApi.addItem(payload);
        get().updateItemLocally(item);
        set({ isLoading: false });
        return item;
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message, isLoading: false });
        throw new Error(message);
      }
    },

    updateItem: async (itemId, payload) => {
      try {
        const updated = await inventoryApi.updateItem(itemId, payload);
        get().updateItemLocally(updated);
        return updated;
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message });
        throw new Error(message);
      }
    },

    deleteItem: async (itemId) => {
      try {
        await inventoryApi.deleteItem(itemId);
        get().removeItemLocally(itemId);
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message });
        throw new Error(message);
      }
    },

    updateItemLocally: (item: InventoryItem) => {
      set((state) => {
        const index = state.items.findIndex((i) => i._id === item._id);
        if (index >= 0) {
          const next = [...state.items];
          next[index] = item;
          return { items: next };
        } else {
          return { items: [...state.items, item] };
        }
      });
    },

    removeItemLocally: (itemId: string) => {
      set((state) => ({
        items: state.items.filter((i) => i._id !== itemId),
      }));
    },

    clearError: () => set({ error: null }),
  };
});
