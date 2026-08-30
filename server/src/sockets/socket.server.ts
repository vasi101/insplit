import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT auth middleware for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { userId: string; isAdmin?: boolean }).userId = payload.userId;
      (socket as Socket & { userId: string; isAdmin?: boolean }).isAdmin = !!payload.isAdmin;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket & { userId?: string; isAdmin?: boolean }) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId}, admin: ${!!socket.isAdmin})`);

    // Auto-join admin channel if user is admin
    if (socket.isAdmin) {
      socket.join('admin:channel');
    }

    // Client joins a room channel
    socket.on('join:room', (roomId: string) => {
      if (roomId) {
        socket.join(`room:${roomId}`);
        console.log(`👤 User ${socket.userId} joined room channel: room:${roomId}`);
      }
    });

    socket.on('leave:room', (roomId: string) => {
      if (roomId) {
        socket.leave(`room:${roomId}`);
      }
    });

    socket.on('join:admin', () => {
      socket.join('admin:channel');
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function emitToRoom(roomId: string, event: string, payload: any): void {
  if (!io) return;
  io.to(`room:${roomId}`).emit(event, payload);
  // Also forward to admin channel
  io.to('admin:channel').emit(event, payload);
}

export function emitToAdmin(event: string, payload: any): void {
  if (!io) return;
  io.to('admin:channel').emit(event, payload);
}

export function emitGlobal(event: string, payload: any): void {
  if (!io) return;
  io.emit(event, payload);
}
