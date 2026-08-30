import { io, Socket } from 'socket.io-client';
import { getStoredTokens, getApiBaseUrl } from './api';
import { clientCache } from '../utils/cache';

let socket: Socket | null = null;

export function getSocketUrl(): string {
  const apiBase = getApiBaseUrl();
  return apiBase.replace(/\/api\/?$/, '');
}

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

  socket = io(getSocketUrl(), {
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

  // Invalidation map: socket event → cache prefixes to purge
  const invalidationMap: Record<string, string[]> = {
    'transaction:created':  ['transactions:', 'stats'],
    'transaction:approved': ['transactions:', 'stats'],
    'transaction:rejected': ['transactions:', 'stats'],
    'transaction:updated':  ['transactions:', 'stats'],
    'transaction:deleted':  ['transactions:', 'stats'],
    'inventory:created':   ['inventory:', 'stats'],
    'inventory:updated':   ['inventory:', 'stats'],
    'inventory:deleted':   ['inventory:', 'stats'],
    'user:created':        ['users:', 'stats'],
    'user:updated':        ['users:', 'stats'],
    'user:deleted':        ['users:', 'stats'],
    'room:created':        ['rooms:', 'stats'],
    'room:updated':        ['rooms:', 'stats'],
    'room:deleted':        ['rooms:', 'stats'],
  };

  events.forEach((evt) => {
    socket?.on(evt, (data) => {
      // Auto-purge matching cache prefixes
      const prefixes = invalidationMap[evt];
      if (prefixes) {
        prefixes.forEach((prefix) => clientCache.deletePrefix(prefix));
      }
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
