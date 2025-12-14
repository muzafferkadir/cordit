import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import Room from '../models/room';
import Message from '../models/message';
import { logger } from './logger';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface JoinRoomData {
  roomId: string;
}

interface SendMessageData {
  roomId: string;
  text: string;
}

interface TypingData {
  roomId: string;
}

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as { username: string; role: string };

      socket.userId = decoded.username; // We're using username as ID for now
      socket.username = decoded.username;

      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User connected: ${socket.username} (${socket.id})`);

    // Join room
    socket.on('join_room', async (data: JoinRoomData) => {
      try {
        const { roomId } = data;

        const room = await Room.findOne({ _id: roomId, isDeleted: false });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(roomId);

        logger.info(`${socket.username} joined room ${room.name}`);

        // Broadcast to room that user joined
        io.to(roomId).emit('user_joined', {
          username: socket.username,
          timestamp: new Date(),
        });

        socket.emit('joined_room', {
          roomId,
          roomName: room.name,
        });
      } catch (error) {
        logger.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave_room', async (data: JoinRoomData) => {
      try {
        const { roomId } = data;

        socket.leave(roomId);

        logger.info(`${socket.username} left room ${roomId}`);

        // Broadcast to room that user left
        io.to(roomId).emit('user_left', {
          username: socket.username,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error leaving room:', error);
      }
    });

    // Send message
    socket.on('send_message', async (data: SendMessageData) => {
      try {
        const { roomId, text } = data;

        if (!text || text.trim().length === 0) {
          socket.emit('error', { message: 'Message text is required' });
          return;
        }

        if (text.length > 2000) {
          socket.emit('error', { message: 'Message too long (max 2000 characters)' });
          return;
        }

        const room = await Room.findOne({ _id: roomId, isDeleted: false });
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Get user from database to get ObjectId
        const User = (await import('../models/user')).default;
        const user = await User.findOne({ username: socket.username });
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Save message to database
        const message = new Message({
          roomId,
          userId: user._id,
          username: socket.username,
          text: text.trim(),
          messageType: 'text',
        });

        await message.save();

        // Broadcast message to all users in room
        io.to(roomId).emit('new_message', {
          _id: message._id,
          roomId: message.roomId,
          userId: message.userId,
          username: message.username,
          text: message.text,
          messageType: message.messageType,
          createdAt: message.createdAt,
        });

        logger.info(`Message sent in room ${roomId} by ${socket.username}`);
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing_start', (data: TypingData) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        username: socket.username,
        isTyping: true,
      });
    });

    socket.on('typing_stop', (data: TypingData) => {
      const { roomId } = data;
      socket.to(roomId).emit('user_typing', {
        username: socket.username,
        isTyping: false,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.username} (${socket.id})`);
    });
  });

  return io;
};
