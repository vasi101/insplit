import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { initSocketServer } from './sockets/socket.server';

async function bootstrap() {
  // Connect to MongoDB
  await connectDatabase();

  // Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initSocketServer(httpServer);

  // Start listening on all network interfaces
  httpServer.listen(env.port, '0.0.0.0', () => {
    console.log(`🚀 Insplit server running on port ${env.port} [${env.nodeEnv}]`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌐 API: http://localhost:${env.port}/api`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => process.exit(0));
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
