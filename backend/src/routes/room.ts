import 'dotenv/config';
import express, { Router, Request, Response } from 'express';
import validator from '../middlewares/validator';
import verifyToken from '../middlewares/verifyToken';
import checkRoles from '../middlewares/checkRoles';
import { createRoom, updateRoom } from '../validators/room';
import Room from '../models/room';
import Message from '../models/message';

const router: Router = express.Router();

// Get all rooms
router.get('/', verifyToken, async (_req: Request, res: Response) => {
  try {
    const rooms = await Room.find({ isDeleted: false })
      .select('-activeUsers')
      .sort({ isDefault: -1, createdAt: -1 });

    const roomsWithCount = await Promise.all(
      rooms.map(async (room) => {
        const activeUserCount = await Room.findById(room._id)
          .select('activeUsers')
          .then((r) => r?.activeUsers.length || 0);
        
        return {
          ...room.toObject(),
          activeUserCount,
        };
      }),
    );

    res.sendResponse(200, { rooms: roomsWithCount });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get room by ID with details
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    const messageCount = await Message.countDocuments({ roomId: room._id });

    res.sendResponse(200, {
      room,
      messageCount,
      activeUserCount: room.activeUsers.length,
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Create a new room (admin only)
router.post('/', verifyToken, checkRoles('admin'), validator(createRoom), async (req: Request, res: Response) => {
  try {

    const { name, description, maxUsers } = req.body;

    const existingRoom = await Room.findOne({ name, isDeleted: false });
    if (existingRoom) {
      res.sendError(409, 'Room with this name already exists');
      return;
    }

    const room = new Room({
      name,
      description,
      maxUsers,
      isDefault: false,
      activeUsers: [],
    });

    await room.save();
    res.sendResponse(201, room);
  } catch (error) {
    res.sendError(500, error);
  }
});

// Update room (admin only)
router.put('/:id', verifyToken, checkRoles('admin'), validator(updateRoom), async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    if (room.isDefault) {
      res.sendError(403, 'Cannot modify default room');
      return;
    }

    const { name, description, maxUsers } = req.body;
    
    if (name && name !== room.name) {
      const existingRoom = await Room.findOne({ name, isDeleted: false });
      if (existingRoom) {
        res.sendError(409, 'Room with this name already exists');
        return;
      }
      room.name = name;
    }

    if (description !== undefined) room.description = description;
    if (maxUsers !== undefined) room.maxUsers = maxUsers;

    await room.save();
    res.sendResponse(200, room);
  } catch (error) {
    res.sendError(500, error);
  }
});

// Delete room (admin only - soft delete)
router.delete('/:id', verifyToken, checkRoles('admin'), async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    if (room.isDefault) {
      res.sendError(403, 'Cannot delete default room');
      return;
    }

    // Soft delete the room
    room.isDeleted = true;
    room.deletedAt = new Date();
    room.deletedBy = req.user?.username as any;
    await room.save();
    
    // Soft delete all messages in the room
    await Message.updateMany(
      { roomId: room._id, isDeleted: false },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: req.user?.username as any,
        },
      },
    );
    
    res.sendResponse(200, 'Room deleted successfully');
  } catch (error) {
    res.sendError(500, error);
  }
});

// Join room
router.post('/:id/join', verifyToken, async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    const userId = req.user?.username;
    if (!userId) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    // Check if user is already in the room
    const isUserInRoom = room.activeUsers.some(
      (user) => user.username === userId,
    );

    if (isUserInRoom) {
      res.sendResponse(200, { message: 'Already in room', room });
      return;
    }

    // Check room capacity
    if (room.maxUsers && room.activeUsers.length >= room.maxUsers) {
      res.sendError(403, 'Room is full');
      return;
    }

    // Add user to room
    room.activeUsers.push({
      userId: req.user?.username as any, // We'll fix this with proper user ID later
      username: userId,
      joinedAt: new Date(),
      isVoiceActive: false,
    });

    await room.save();

    // Create system message
    const systemMessage = new Message({
      roomId: room._id,
      userId: req.user?.username as any,
      username: 'System',
      text: `${userId} joined the room`,
      messageType: 'system',
    });
    await systemMessage.save();

    res.sendResponse(200, { message: 'Joined room successfully', room });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Leave room
router.post('/:id/leave', verifyToken, async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false });
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    const userId = req.user?.username;
    if (!userId) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    // Remove user from room
    const initialLength = room.activeUsers.length;
    room.activeUsers = room.activeUsers.filter(
      (user) => user.username !== userId,
    );

    if (room.activeUsers.length === initialLength) {
      res.sendError(400, 'User not in room');
      return;
    }

    await room.save();

    // Create system message
    const systemMessage = new Message({
      roomId: room._id,
      userId: req.user?.username as any,
      username: 'System',
      text: `${userId} left the room`,
      messageType: 'system',
    });
    await systemMessage.save();

    res.sendResponse(200, { message: 'Left room successfully' });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get active users in room
router.get('/:id/users', verifyToken, async (req: Request, res: Response) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, isDeleted: false }).select('activeUsers');
    if (!room) {
      res.sendError(404, 'Room not found');
      return;
    }

    res.sendResponse(200, { activeUsers: room.activeUsers });
  } catch (error) {
    res.sendError(500, error);
  }
});

export default router;
