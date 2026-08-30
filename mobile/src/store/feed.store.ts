import { create } from 'zustand';
import { Transaction, TransactionStatus } from '../types';
import * as txApi from '../services/api/transactions.api';
import { extractErrorMessage } from '../services/api/client';
import { registerSocketHandlers } from '../services/socket/socket.service';

export type FeedFilter = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED';

interface FeedState {
  transactions: Transaction[];
  filter: FeedFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  page: number;
  totalPages: number;
  total: number;
  error: string | null;

  // Actions
  fetchFeed: (roomId: string, page?: number, isRefresh?: boolean) => Promise<void>;
  setFilter: (filter: FeedFilter, roomId: string) => void;
  createTransaction: (payload: txApi.CreateTransactionPayload) => Promise<Transaction>;
  approveTransaction: (transactionId: string) => Promise<void>;
  rejectTransaction: (transactionId: string, reason?: string) => Promise<void>;
  updateTransactionLocally: (transaction: Transaction) => void;
  clearError: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => {
  // Register socket listeners once
  registerSocketHandlers({
    onTransactionCreated: (transaction) => {
      get().updateTransactionLocally(transaction);
    },
    onTransactionApproved: (transaction) => {
      get().updateTransactionLocally(transaction);
    },
    onTransactionRejected: (transaction) => {
      get().updateTransactionLocally(transaction);
    },
    onTransactionUpdated: (transaction) => {
      get().updateTransactionLocally(transaction);
    },
    onTransactionDeleted: (transactionId) => {
      set((state) => ({
        transactions: state.transactions.filter((t) => t._id !== transactionId),
      }));
    },
  });

  return {
    transactions: [],
    filter: 'ALL',
    isLoading: false,
    isRefreshing: false,
    page: 1,
    totalPages: 1,
    total: 0,
    error: null,

    fetchFeed: async (roomId: string, page = 1, isRefresh = false) => {
      if (!roomId) return;
      const { filter } = get();

      if (isRefresh) {
        set({ isRefreshing: true, error: null });
      } else if (page === 1) {
        set({ isLoading: true, error: null });
      }

      try {
        const statusParam = filter === 'ALL' ? undefined : filter;
        const res = await txApi.listTransactions({
          roomId,
          status: statusParam,
          page,
          limit: 20,
        });

        set((state) => ({
          transactions: page === 1 ? res.transactions : [...state.transactions, ...res.transactions],
          page: res.page,
          totalPages: res.pages,
          total: res.total,
          isLoading: false,
          isRefreshing: false,
        }));
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message, isLoading: false, isRefreshing: false });
      }
    },

    setFilter: (filter: FeedFilter, roomId: string) => {
      set({ filter });
      get().fetchFeed(roomId, 1);
    },

    createTransaction: async (payload) => {
      try {
        const tx = await txApi.createTransaction(payload);
        get().updateTransactionLocally(tx);
        return tx;
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message });
        throw new Error(message);
      }
    },

    approveTransaction: async (transactionId: string) => {
      try {
        const updated = await txApi.approveTransaction(transactionId);
        get().updateTransactionLocally(updated);
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message });
        throw new Error(message);
      }
    },

    rejectTransaction: async (transactionId: string, reason?: string) => {
      try {
        const updated = await txApi.rejectTransaction(transactionId, reason);
        get().updateTransactionLocally(updated);
      } catch (err) {
        const message = extractErrorMessage(err);
        set({ error: message });
        throw new Error(message);
      }
    },

    updateTransactionLocally: (transaction: Transaction) => {
      set((state) => {
        const index = state.transactions.findIndex((t) => t._id === transaction._id);
        if (index >= 0) {
          const updated = [...state.transactions];
          updated[index] = transaction;
          return { transactions: updated };
        } else {
          return { transactions: [transaction, ...state.transactions] };
        }
      });
    },

    clearError: () => set({ error: null }),
  };
});
