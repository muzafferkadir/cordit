import 'dotenv/config';
import express, { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/user';
import InviteCode from '../models/inviteCode';
import validator from '../middlewares/validator';
import verifyToken from '../middlewares/verifyToken';
import checkRoles from '../middlewares/checkRoles';
import { login, register } from '../validators/user';
import { mongoIdSchema } from '../validators/params';
import { config } from '../config';

const router: Router = express.Router();

router.post('/login', validator(login), async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, isDeleted: false }).select('+password');
    if (!user) {
      res.sendError(401, 'Username or password is incorrect.');
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.sendError(401, 'Username or password is incorrect.');
      return;
    }

    const token = jwt.sign(
      { username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: '2h' },
    );

    res.sendResponse(200, {
      token,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Register new user with invite code
router.post('/register', validator(register), async (req: Request, res: Response) => {
  try {
    const { username, password, inviteCode } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.sendError(409, 'Username already exists');
      return;
    }

    // Validate invite code
    const invite = await InviteCode.findOne({
      code: inviteCode.toUpperCase(),
      isDeleted: false,
    });

    if (!invite) {
      res.sendError(400, 'Invalid invite code');
      return;
    }

    const now = new Date();

    if (invite.expiresAt < now) {
      res.sendError(400, 'Invite code has expired');
      return;
    }

    if (invite.currentUses >= invite.maxUses) {
      res.sendError(400, 'Invite code has been fully used');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      username,
      password: hashedPassword,
      role: 'user',
    });

    await newUser.save();

    // Update invite code usage
    invite.currentUses += 1;
    if (invite.currentUses >= invite.maxUses) {
      invite.isUsed = true;
    }

    // Store last user info (for tracking)
    invite.usedBy = newUser._id;
    invite.usedByUsername = username;
    invite.usedAt = now;

    await invite.save();

    // Generate token for new user
    const token = jwt.sign(
      { username: newUser.username, role: newUser.role },
      config.jwtSecret,
      { expiresIn: '2h' },
    );

    res.sendResponse(201, {
      message: 'User registered successfully',
      token,
      username: newUser.username,
      role: newUser.role,
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get all users (admin only)
router.get('/', verifyToken, checkRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const users = await User.find({ isDeleted: false })
      .select('-password')
      .sort({ createdAt: -1 });

    res.sendResponse(200, { users });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Delete user (admin only - soft delete)
router.delete('/:id', verifyToken, checkRoles('admin'), validator(mongoIdSchema, 'params'), async (req: Request, res: Response) => {
  try {
    const userToDelete = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!userToDelete) {
      res.sendError(404, 'User not found');
      return;
    }

    // Prevent admin from deleting themselves
    if (userToDelete.username === req.user?.username) {
      res.sendError(403, 'You cannot delete yourself');
      return;
    }

    // Prevent deleting other admins
    if (userToDelete.role === 'admin') {
      res.sendError(403, 'Cannot delete admin users');
      return;
    }

    // Get admin user from database to get ObjectId
    const adminUser = await User.findOne({ username: req.user?.username });
    if (!adminUser) {
      res.sendError(404, 'Admin user not found');
      return;
    }

    // Soft delete the user
    userToDelete.isDeleted = true;
    userToDelete.deletedAt = new Date();
    userToDelete.deletedBy = adminUser._id;
    await userToDelete.save();

    res.sendResponse(200, 'User deleted successfully');
  } catch (error) {
    res.sendError(500, error);
  }
});

export default router;
