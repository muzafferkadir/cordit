import 'dotenv/config';
import express, { Router, Request, Response } from 'express';
import crypto from 'crypto';
import validator from '../middlewares/validator';
import verifyToken from '../middlewares/verifyToken';
import checkRoles from '../middlewares/checkRoles';
import { createInviteCode } from '../validators/inviteCode';
import InviteCode from '../models/inviteCode';

const router: Router = express.Router();

// Generate random invite code
const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Create invite code (admin only)
router.post('/', verifyToken, checkRoles('admin'), validator(createInviteCode), async (req: Request, res: Response) => {
  try {
    const { expiresInHours = 1, maxUses = 1 } = req.body;

    // Generate unique code
    let code = generateInviteCode();
    let existingCode = await InviteCode.findOne({ code, isDeleted: false });
    
    // Ensure uniqueness
    while (existingCode) {
      code = generateInviteCode();
      existingCode = await InviteCode.findOne({ code, isDeleted: false });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const inviteCode = new InviteCode({
      code,
      createdBy: req.user?.username as any,
      createdByUsername: req.user?.username,
      expiresAt,
      maxUses,
      currentUses: 0,
      isUsed: false,
    });

    await inviteCode.save();

    res.sendResponse(201, {
      code: inviteCode.code,
      expiresAt: inviteCode.expiresAt,
      maxUses: inviteCode.maxUses,
      createdBy: inviteCode.createdByUsername,
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get all invite codes (admin only)
router.get('/', verifyToken, checkRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const inviteCodes = await InviteCode.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .select('-__v');

    const now = new Date();
    const codesWithStatus = inviteCodes.map((code) => ({
      ...code.toObject(),
      isExpired: code.expiresAt < now,
      isAvailable: code.expiresAt >= now && code.currentUses < code.maxUses,
      remainingUses: code.maxUses - code.currentUses,
    }));

    res.sendResponse(200, { inviteCodes: codesWithStatus });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Get invite code details (admin only)
router.get('/:code', verifyToken, checkRoles('admin'), async (req: Request, res: Response) => {
  try {
    const inviteCode = await InviteCode.findOne({ 
      code: req.params.code.toUpperCase(), 
      isDeleted: false,
    });

    if (!inviteCode) {
      res.sendError(404, 'Invite code not found');
      return;
    }

    const now = new Date();
    res.sendResponse(200, {
      ...inviteCode.toObject(),
      isExpired: inviteCode.expiresAt < now,
      isAvailable: inviteCode.expiresAt >= now && inviteCode.currentUses < inviteCode.maxUses,
      remainingUses: inviteCode.maxUses - inviteCode.currentUses,
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Validate invite code (public - for registration check)
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string' || code.length !== 8) {
      res.sendError(400, 'Invalid invite code format');
      return;
    }

    const inviteCode = await InviteCode.findOne({ 
      code: code.toUpperCase(), 
      isDeleted: false,
    });

    if (!inviteCode) {
      res.sendResponse(200, { valid: false, reason: 'Invalid code' });
      return;
    }

    const now = new Date();
    
    if (inviteCode.expiresAt < now) {
      res.sendResponse(200, { valid: false, reason: 'Code expired' });
      return;
    }

    if (inviteCode.currentUses >= inviteCode.maxUses) {
      res.sendResponse(200, { valid: false, reason: 'Code fully used' });
      return;
    }

    res.sendResponse(200, { 
      valid: true, 
      expiresAt: inviteCode.expiresAt,
      remainingUses: inviteCode.maxUses - inviteCode.currentUses,
    });
  } catch (error) {
    res.sendError(500, error);
  }
});

// Delete invite code (admin only - soft delete)
router.delete('/:code', verifyToken, checkRoles('admin'), async (req: Request, res: Response) => {
  try {
    const inviteCode = await InviteCode.findOne({ 
      code: req.params.code.toUpperCase(), 
      isDeleted: false,
    });

    if (!inviteCode) {
      res.sendError(404, 'Invite code not found');
      return;
    }

    inviteCode.isDeleted = true;
    inviteCode.deletedAt = new Date();
    inviteCode.deletedBy = req.user?.username as any;
    await inviteCode.save();

    res.sendResponse(200, 'Invite code deleted successfully');
  } catch (error) {
    res.sendError(500, error);
  }
});

export default router;
