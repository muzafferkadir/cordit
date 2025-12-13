import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
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

const app: Application = express();
const httpServer = createServer(app);
app.use(express.json());
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

const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

// Health check endpoint for Docker
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/user', userRoutes);
app.use('/room', roomRoutes);
app.use('/message', messageRoutes);
app.use('/invite', inviteCodeRoutes);

// Initialize default data
db.once('open', async () => {
  logger.info('MongoDB connected successfully');

  if (process.env.CREATE_ADMIN_INITIALLY === 'true') {
    await createAdmin();
  }

  await createDefaultRoom();
});

// Initialize Socket.io
const io = initializeSocket(httpServer);

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running at http://${HOST}:${PORT}/`);
  logger.info('Socket.io initialized');
});

export default app;
export { io };
