import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { Room } from '../modules/rooms/room.model';

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
    let roomJoinVersion = 0;
    socket.on('join:room', async (roomId: string) => {
      const version = ++roomJoinVersion;
      if (typeof roomId !== 'string' || !/^[a-f0-9]{24}$/i.test(roomId)) return;
      try {
        const member = await Room.exists({
          _id: roomId,
          members: { $elemMatch: { userId: socket.userId, status: 'ACTIVE' } },
        });
        if (!member || !socket.connected || version !== roomJoinVersion) return;
        await socket.join(`room:${roomId}`);
      } catch (error) {
        console.error('Failed to authorize room subscription:', error);
      }
    });

    socket.on('leave:room', (roomId: string) => {
      roomJoinVersion += 1;
      if (roomId) {
        socket.leave(`room:${roomId}`);
      }
    });

    socket.on('join:admin', () => {
      if (socket.isAdmin) socket.join('admin:channel');
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
