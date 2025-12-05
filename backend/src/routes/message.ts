import 'dotenv/config';
import express, { Router, Request, Response } from 'express';
import validator from '../middlewares/validator';
import verifyToken from '../middlewares/verifyToken';
import checkRoles from '../middlewares/checkRoles';
import { sendMessage, getMessages } from '../validators/message';
import Message from '../models/message';
import Room from '../models/room';

const router: Router = express.Router();

// Send a message to a room
router.post('/', verifyToken, validator(sendMessage), async (req: Request, res: Response) => {
  try {
    const { roomId, text } = req.body;
    const username = req.user?.username;

    if (!username) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    // Get user from database to get ObjectId
    const User = (await import('../models/user')).default;
    const user = await User.findOne({ username });
    if (!user) {
      res.sendError(404, 'User not found');
      return;
    }

    // Check if room exists and is not deleted
    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    // Check if user is in the room
    const isUserInRoom = room.activeUsers.some(
      (u) => u.username === username,
    );

    if (!isUserInRoom) {
      res.sendError(403, 'You must join the room before sending messages');
      return;
    }

    // Create message
    const message = new Message({
      roomId,
      userId: user._id,
      username: username,
      text,
      messageType: 'text',
    });

    await message.save();

    res.sendResponse(201, message);
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get messages from a room (by roomId in path)
router.get('/room/:roomId', verifyToken, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if room exists and is not deleted
    const room = await Room.findOne({ _id: roomId, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({ roomId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalMessages = await Message.countDocuments({ roomId, isDeleted: false });
    const totalPages = Math.ceil(totalMessages / Number(limit));

    // Reverse to show oldest first
    const orderedMessages = messages.reverse();

    res.sendResponse(200, {
      messages: orderedMessages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalMessages,
        totalPages,
        hasMore: Number(page) < totalPages,
      },
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get messages from a room (legacy query param version)
router.get('/', verifyToken, validator(getMessages, 'query'), async (req: Request, res: Response) => {
  try {
    const { roomId, page = 1, limit = 50 } = req.query;

    // Check if room exists and is not deleted
    const room = await Room.findOne({ _id: roomId as string, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const messages = await Message.find({ roomId, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const totalMessages = await Message.countDocuments({ roomId, isDeleted: false });
    const totalPages = Math.ceil(totalMessages / Number(limit));

    // Reverse to show oldest first
    const orderedMessages = messages.reverse();

    res.sendResponse(200, {
      messages: orderedMessages,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalMessages,
        totalPages,
        hasMore: Number(page) < totalPages,
      },
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get a specific message
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const message = await Message.findOne({ _id: req.params.id, isDeleted: false });
    if (!message) {
      res.sendError(404, 'Message not found');
      return;
    }

    res.sendResponse(200, message);
  } catch (error) {
    res.sendError(500, error);
  }
});

// Delete a message (own message or admin - soft delete)
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const message = await Message.findOne({ _id: req.params.id, isDeleted: false });
    if (!message) {
      res.sendError(404, 'Message not found');
      return;
    }

    const userId = req.user?.username;
    const isAdmin = req.user?.role === 'admin';

    // Check if user owns the message or is admin
    if (message.username !== userId && !isAdmin) {
      res.sendError(403, 'You can only delete your own messages');
      return;
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user?.username as any;
    await message.save();
    
    res.sendResponse(200, 'Message deleted successfully');
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get recent messages across all rooms (for admin)
router.get('/admin/recent', verifyToken, checkRoles('admin'), async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const messages = await Message.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate('roomId', 'name');

    res.sendResponse(200, { messages });
  } catch (error) {
    res.sendError(500, error);
  }
});

export default router;
