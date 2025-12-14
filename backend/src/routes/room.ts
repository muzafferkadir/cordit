import 'dotenv/config';
import express, { Router, Request, Response } from 'express';
import validator from '../middlewares/validator';
import verifyToken from '../middlewares/verifyToken';
import checkRoles from '../middlewares/checkRoles';
import { createRoom, updateRoom } from '../validators/room';
import Room from '../models/room';
import Message from '../models/message';
import { createLiveKitToken, createLiveKitRoom, deleteLiveKitRoom, getLiveKitRoom } from '../utils/livekit';

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

    // Generate unique LiveKit room name
    const livekitRoomName = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create LiveKit room
    await createLiveKitRoom(livekitRoomName, maxUsers);

    const room = new Room({
      name,
      description,
      maxUsers,
      isDefault: false,
      activeUsers: [],
      livekitRoomName,
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

    // Get user from database to get ObjectId
    const username = req.user?.username;
    const User = (await import('../models/user')).default;
    const user = await User.findOne({ username });

    // Soft delete the room
    room.isDeleted = true;
    room.deletedAt = new Date();
    room.deletedBy = user?._id;
    await room.save();

    // Delete LiveKit room
    if (room.livekitRoomName) {
      try {
        await deleteLiveKitRoom(room.livekitRoomName);
      } catch (error) {
        console.error('Error deleting LiveKit room:', error);
      }
    }

    // Soft delete all messages in the room
    await Message.updateMany(
      { roomId: room._id, isDeleted: false },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user?._id,
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

    const livekitUrl = process.env.LIVEKIT_URL || 'ws://localhost:7880';

    // Ensure LiveKit room exists for legacy rooms created before voice support
    if (!room.livekitRoomName) {
      const livekitRoomName = `room_${room._id}_${Date.now()}`;
      try {
        await createLiveKitRoom(livekitRoomName, room.maxUsers);
        room.livekitRoomName = livekitRoomName;
        await room.save();
      } catch (error) {
        // If room already exists in LiveKit, reuse it; otherwise surface the error
        try {
          const existing = await getLiveKitRoom(livekitRoomName);
          if (existing) {
            room.livekitRoomName = livekitRoomName;
            await room.save();
          } else {
            throw error;
          }
        } catch (innerError) {
          console.error('Error creating LiveKit room on join:', innerError);
          res.sendError(500, 'Failed to initialize voice for this room');
          return;
        }
      }
    }

    const username = req.user?.username;
    if (!username) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    // Get user from database to get ObjectId
    const user = await (await import('../models/user')).default.findOne({ username });
    if (!user) {
      res.sendError(404, 'User not found');
      return;
    }

    // Check if user is already in the room
    const isUserInRoom = room.activeUsers.some(
      (u) => u.username === username,
    );

    if (isUserInRoom) {
      // Generate LiveKit token even if already in room
      let livekitToken = null;
      if (room.livekitRoomName) {
        try {
          const existingUser = room.activeUsers.find(u => u.username === username);
          livekitToken = await createLiveKitToken(
            room.livekitRoomName,
            username,
            existingUser?.livekitParticipantId || `user_${username}_${Date.now()}`,
          );
        } catch (error) {
          console.error('Error creating LiveKit token:', error);
        }
      }

      res.sendResponse(200, {
        message: 'Already in room',
        room,
        livekitToken,
        livekitUrl,
      });
      return;
    }

    // Check room capacity
    if (room.maxUsers && room.activeUsers.length >= room.maxUsers) {
      res.sendError(403, 'Room is full');
      return;
    }

    // Generate LiveKit participant ID
    const livekitParticipantId = `user_${username}_${Date.now()}`;

    // Add user to room
    room.activeUsers.push({
      userId: user._id,
      username: username,
      joinedAt: new Date(),
      isVoiceActive: false,
      livekitParticipantId,
    });

    await room.save();

    // Generate LiveKit token for voice chat
    let livekitToken = null;
    if (room.livekitRoomName) {
      try {
        livekitToken = await createLiveKitToken(
          room.livekitRoomName,
          username,
          livekitParticipantId,
        );
      } catch (error) {
        console.error('Error creating LiveKit token:', error);
      }
    }

    // Create system message
    const systemMessage = new Message({
      roomId: room._id,
      userId: user._id,
      username: 'System',
      text: `${username} joined the room`,
      messageType: 'system',
    });
    await systemMessage.save();

    res.sendResponse(200, {
      message: 'Joined room successfully',
      room,
      livekitToken,
      livekitUrl,
    });
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

    const username = req.user?.username;
    if (!username) {
      res.sendError(401, 'User not authenticated');
      return;
    }

    // Get user from database
    const User = (await import('../models/user')).default;
    const user = await User.findOne({ username });
    if (!user) {
      res.sendError(404, 'User not found');
      return;
    }

    // Remove user from room
    const initialLength = room.activeUsers.length;
    room.activeUsers = room.activeUsers.filter(
      (u) => u.username !== username,
    );

    if (room.activeUsers.length === initialLength) {
      res.sendError(400, 'User not in room');
      return;
    }

    await room.save();

    // Create system message
    const systemMessage = new Message({
      roomId: room._id,
      userId: user._id,
      username: 'System',
      text: `${username} left the room`,
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
