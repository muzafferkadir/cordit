import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import errorHandler from './middlewares/errorHandler';
import responseHandler from './middlewares/responseHandler';
import userRoutes from './routes/user';
import roomRoutes from './routes/room';
import messageRoutes from './routes/message';
import inviteCodeRoutes from './routes/inviteCode';
import createAdmin from './utils/createAdmin';
import createDefaultRoom from './utils/createDefaultRoom';
import { logger } from './utils/logger';
import { initializeSocket } from './utils/socket';

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  logger.error('FATAL: ACCESS_TOKEN_SECRET is missing or too short (min 32 chars). Exiting.');
  process.exit(1);
}

const app: Application = express();
const httpServer = createServer(app);

app.use(helmet());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.sendError = errorHandler.bind(null, req, res);
  next();
});

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.sendResponse = responseHandler.bind(null, res);
  next();
});

const mongoDB = process.env.DATABASE_URL || '';
mongoose.connect(mongoDB);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Use Stricter Rate Limiting for Auth Routes
app.use('/user/login', authLimiter);
app.use('/user/register', authLimiter);

app.use('/user', userRoutes);
app.use('/room', roomRoutes);
app.use('/message', messageRoutes);
app.use('/invite', inviteCodeRoutes);

db.once('open', async () => {
  logger.info('MongoDB connected successfully');

  if (process.env.CREATE_ADMIN_INITIALLY === 'true') {
    await createAdmin();
  }

  await createDefaultRoom();
});

const io = initializeSocket(httpServer);

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running at http://${HOST}:${PORT}/`);
  logger.info('Socket.io initialized');
  logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
});

export default app;
export { io };

