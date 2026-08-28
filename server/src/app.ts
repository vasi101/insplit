import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import authRoutes from './modules/auth/auth.routes';
import roomRoutes from './modules/rooms/room.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import settlementRoutes from './modules/settlements/settlement.routes';
import uploadRoutes from './modules/uploads/upload.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

// Required for correct client IPs and rate limiting behind Render/Railway/etc.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// ─── Global Middleware ──────────────────────────────────────────────────────
app.use(cors({
  // Native clients generally omit Origin; browsers must match the allowlist.
  origin: env.nodeEnv === 'production'
    ? (origin, callback) => callback(null, !origin || env.corsOrigins.includes(origin))
    : true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // max 20 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'TOO_MANY_REQUESTS', message: 'Too many requests, please try again later.' },
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/upload', uploadRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
