import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../../../constants/api';
import { getAccessToken, getCustomBaseUrl } from '../../utils/storage';
import { Transaction, Settlement, InventoryItem } from '../../types';

let socket: Socket | null = null;
let activeRoomId: string | null = null;
let connectionAttempt: Promise<Socket | null> | null = null;
let connectionGeneration = 0;
const connectListeners = new Set<() => void>();

export function subscribeSocketConnect(listener: () => void): () => void {
  connectListeners.add(listener);
  return () => { connectListeners.delete(listener); };
}

export function isSocketConnected(): boolean {
  return !!socket?.connected;
}

export interface SocketEventHandlers {
  onTransactionCreated?: (transaction: Transaction) => void;
  onTransactionApproved?: (transaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
  onTransactionUpdated?: (transaction: Transaction) => void;
  onTransactionDeleted?: (transactionId: string) => void;
  onSettlementCreated?: (settlement: Settlement) => void;
  onInventoryCreated?: (item: InventoryItem) => void;
  onInventoryUpdated?: (item: InventoryItem) => void;
  onInventoryDeleted?: (itemId: string) => void;
  onRoomUpdated?: (data: any) => void;
}

let handlers: SocketEventHandlers = {};

export function registerSocketHandlers(newHandlers: SocketEventHandlers): void {
  handlers = { ...handlers, ...newHandlers };
}

export function connectSocket(): Promise<Socket | null> {
  if (connectionAttempt) return connectionAttempt;
  const attempt = createSocket(connectionGeneration);
  connectionAttempt = attempt;
  void attempt.finally(() => {
    if (connectionAttempt === attempt) connectionAttempt = null;
  }).catch(() => {});
  return attempt;
}

async function createSocket(generation: number): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) return null;

  if (generation !== connectionGeneration) return null;
  if (socket) {
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }

  const customUrl = await getCustomBaseUrl();
  const base = API_CONFIG.HAS_ENV_OVERRIDE
    ? API_CONFIG.BASE_URL
    : (customUrl?.trim().replace(/\/+$/, '') || API_CONFIG.BASE_URL);

  if (generation !== connectionGeneration) return null;
  socket = io(base, {
    auth: (callback) => {
      void getAccessToken().then(token => callback({ token })).catch(() => callback({ token: null }));
    },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('📡 Connected to Insplit Socket.IO server');
    if (activeRoomId) {
      joinSocketRoom(activeRoomId);
    }
    connectListeners.forEach(listener => listener());
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection failed:', error.message);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from Socket.IO server');
  });

  // Transactions
  socket.on('transaction:created', (data: { transaction: Transaction }) => {
    handlers.onTransactionCreated?.(data.transaction);
  });

  socket.on('transaction:approved', (data: { transaction: Transaction }) => {
    handlers.onTransactionApproved?.(data.transaction);
  });

  socket.on('transaction:rejected', (data: { transaction: Transaction }) => {
    handlers.onTransactionRejected?.(data.transaction);
  });

  socket.on('transaction:updated', (data: { transaction: Transaction }) => {
    handlers.onTransactionUpdated?.(data.transaction);
  });

  socket.on('transaction:deleted', (data: { transactionId: string }) => {
    handlers.onTransactionDeleted?.(data.transactionId);
  });

  // Settlements
  socket.on('settlement:created', (data: { settlement: Settlement }) => {
    handlers.onSettlementCreated?.(data.settlement);
  });

  // Inventory
  socket.on('inventory:created', (data: { item: InventoryItem }) => {
    handlers.onInventoryCreated?.(data.item);
  });

  socket.on('inventory:updated', (data: { item: InventoryItem }) => {
    handlers.onInventoryUpdated?.(data.item);
  });

  socket.on('inventory:deleted', (data: { itemId: string }) => {
    handlers.onInventoryDeleted?.(data.itemId);
  });

  return socket;
}

export function joinSocketRoom(roomId: string): void {
  if (activeRoomId && activeRoomId !== roomId) leaveSocketRoom(activeRoomId);
  activeRoomId = roomId;
  if (socket?.connected) {
    socket.emit('join:room', roomId);
  }
}

export function leaveSocketRoom(roomId: string): void {
  if (socket?.connected) {
    socket.emit('leave:room', roomId);
  }
  if (activeRoomId === roomId) {
    activeRoomId = null;
  }
}

export function disconnectSocket(): void {
  connectionGeneration += 1;
  connectionAttempt = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  activeRoomId = null;
}
