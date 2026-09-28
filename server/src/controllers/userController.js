import User from '../models/User.js';
import { sanitizeUser } from './authController.js';
import { computeDiff, logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * List all users with filtering, search, and pagination (Admin only)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { search, role, isActive, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(limitNum),
      User.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limitNum) || 1;

    return res.status(200).json({
      success: true,
      data: users.map(sanitizeUser),
      total,
      page: pageNum,
      pages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (Admin only)
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return sendSuccess(res, 'User retrieved', sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user (Admin only)
 */
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'technician', isActive = true } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const user = await User.create({
      name,
      email,
      password: password || 'DefaultPass123!',
      role,
      isActive
    });

    await logAudit({
      user: req.user._id,
      action: 'create',
      entity: 'User',
      entityId: user._id,
      summary: `Admin created user ${user.email} with role '${user.role}'`
    });

    return sendSuccess(res, 'User created successfully', sanitizeUser(user), 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user details (Admin only)
 * Enforces rule: Prevent admin from demoting or deactivating themselves.
 */
export const updateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isSelf = req.user._id.toString() === targetUserId;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { name, role, isActive } = req.body;

    // Self-protection constraints
    if (isSelf) {
      if (role && role !== 'admin') {
        return res.status(400).json({
          success: false,
          message: 'Security protection: You cannot demote your own administrator account role.'
        });
      }
      if (isActive === false || isActive === 'false') {
        return res.status(400).json({
          success: false,
          message: 'Security protection: You cannot deactivate your own administrator account.'
        });
      }
    }

    const beforeSnapshot = user.toObject();

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);

    await user.save();

    const diff = computeDiff(beforeSnapshot, user);

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'User',
      entityId: user._id,
      summary: `Updated user profile for ${user.email}`,
      changes: diff
    });

    return sendSuccess(res, 'User updated successfully', sanitizeUser(user));
  } catch (error) {
    next(error);
  }
};

/**
 * Update user active status / deactivate (Admin only)
 * Enforces rule: Prevent admin from deactivating themselves.
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isSelf = req.user._id.toString() === targetUserId;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Determine target isActive state
    const targetActiveState =
      req.body.isActive !== undefined ? Boolean(req.body.isActive) : !user.isActive;

    if (isSelf && targetActiveState === false) {
      return res.status(400).json({
        success: false,
        message: 'Security protection: You cannot deactivate your own administrator account.'
      });
    }

    const beforeState = user.isActive;
    user.isActive = targetActiveState;
    await user.save();

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'User',
      entityId: user._id,
      summary: `${targetActiveState ? 'Activated' : 'Deactivated'} user account for ${user.email}`,
      changes: {
        before: { isActive: beforeState },
        after: { isActive: targetActiveState }
      }
    });

    return sendSuccess(
      res,
      `User account ${targetActiveState ? 'activated' : 'deactivated'} successfully`,
      sanitizeUser(user)
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus
};
