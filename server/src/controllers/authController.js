import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { logAudit } from '../utils/auditLogger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register a user
 * If 0 users in DB: open registration, forces first user to 'admin'.
 * Otherwise: requires authenticated admin.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const userCount = await User.countDocuments();
    let assignedRole = role || 'technician';

    if (userCount === 0) {
      // First user becomes admin automatically
      assignedRole = 'admin';
    } else {
      // Require authenticated admin for subsequent registrations
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Registration is restricted. Only administrators can register new accounts.'
        });
      }
    }

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
      password,
      role: assignedRole,
      isActive: true
    });

    // Write audit log
    await logAudit({
      user: req.user?._id || user._id,
      action: 'create',
      entity: 'User',
      entityId: user._id,
      summary: `User ${user.email} (${user.role}) registered`
    });

    const token = generateToken(user);

    return sendSuccess(
      res,
      'User registered successfully',
      {
        token,
        user: sanitizeUser(user)
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user and return JWT token
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    // Record login audit log
    await logAudit({
      user: user._id,
      action: 'login',
      entity: 'User',
      entityId: user._id,
      summary: `User ${user.email} logged in successfully`
    });

    const token = generateToken(user);

    return sendSuccess(res, 'Login successful', {
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get currently authenticated user profile
 */
export const getMe = async (req, res) => {
  return sendSuccess(res, 'Authenticated user retrieved', {
    user: sanitizeUser(req.user)
  });
};

/**
 * Update authenticated user's password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      user: req.user._id,
      action: 'update',
      entity: 'User',
      entityId: req.user._id,
      summary: `User ${user.email} updated their password`
    });

    return sendSuccess(res, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  login,
  getMe,
  changePassword,
  sanitizeUser,
  generateToken
};
