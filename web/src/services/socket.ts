import { io, Socket } from 'socket.io-client';
import { getStoredTokens } from './api';

let socket: Socket | null = null;

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

type SocketListener = (...args: any[]) => void;
const eventListeners = new Map<string, Set<SocketListener>>();

export function getAdminSocket(): Socket | null {
  const { accessToken } = getStoredTokens();
  if (!accessToken) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('📡 Web Admin Socket connected to server');
    socket?.emit('join:admin');
  });

  socket.on('disconnect', () => {
    console.log('🔌 Web Admin Socket disconnected');
  });

  // Forward all events to registered listeners
  const events = [
    'transaction:created',
    'transaction:approved',
    'transaction:rejected',
    'transaction:updated',
    'transaction:deleted',
    'inventory:created',
    'inventory:updated',
    'inventory:deleted',
    'user:created',
    'user:updated',
    'user:deleted',
    'room:created',
    'room:updated',
    'room:deleted',
  ];

  events.forEach((evt) => {
    socket?.on(evt, (data) => {
      const listeners = eventListeners.get(evt);
      if (listeners) {
        listeners.forEach((fn) => fn(data));
      }
    });
  });

  return socket;
}

export function subscribeSocketEvent(event: string, callback: SocketListener): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);

  // Ensure socket is initiated
  getAdminSocket();

  return () => {
    eventListeners.get(event)?.delete(callback);
  };
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
