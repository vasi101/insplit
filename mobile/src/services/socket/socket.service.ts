import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../../../constants/api';
import { getAccessToken, getCustomBaseUrl } from '../../utils/storage';
import { Transaction, Settlement } from '../../types';

let socket: Socket | null = null;
let activeRoomId: string | null = null;

export interface SocketEventHandlers {
  onTransactionCreated?: (transaction: Transaction) => void;
  onTransactionApproved?: (transaction: Transaction) => void;
  onTransactionRejected?: (transaction: Transaction) => void;
  onSettlementCreated?: (settlement: Settlement) => void;
}

let handlers: SocketEventHandlers = {};

export function registerSocketHandlers(newHandlers: SocketEventHandlers): void {
  handlers = { ...handlers, ...newHandlers };
}

export async function connectSocket(): Promise<Socket | null> {
  const token = await getAccessToken();
  if (!token) return null;

  if (socket?.connected) return socket;

  const customUrl = await getCustomBaseUrl();
  const base = customUrl || API_CONFIG.BASE_URL;

  socket = io(base, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('📡 Connected to Insplit Socket.IO server');
    if (activeRoomId) {
      joinSocketRoom(activeRoomId);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected from Socket.IO server');
  });

  socket.on('transaction:created', (data: { transaction: Transaction }) => {
    handlers.onTransactionCreated?.(data.transaction);
  });

  socket.on('transaction:approved', (data: { transaction: Transaction }) => {
    handlers.onTransactionApproved?.(data.transaction);
  });

  socket.on('transaction:rejected', (data: { transaction: Transaction }) => {
    handlers.onTransactionRejected?.(data.transaction);
  });

  socket.on('settlement:created', (data: { settlement: Settlement }) => {
    handlers.onSettlementCreated?.(data.settlement);
  });

  return socket;
}

export function joinSocketRoom(roomId: string): void {
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
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  activeRoomId = null;
}
