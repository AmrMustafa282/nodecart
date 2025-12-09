const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const redis = require('../config/redis');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger,
  EventBus,
  eventTypes,
} = require('@nodecart/shared');

// Initialize event bus
const eventBus = new EventBus();
eventBus.connect().catch((err) => logger.error('EventBus connection failed', { error: err.message }));

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role: role || 'user',
  });

  logger.info('User registered', { userId: user._id, email: user.email });

  // Publish user.registered event
  try {
    await eventBus.publish(eventTypes.USER_REGISTERED, {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    logger.error('Failed to publish user.registered event', { error: error.message });
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.email, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await user.save();

  responseFormatter.success(
    res,
    {
      user,
      accessToken,
      refreshToken,
    },
    'User registered successfully',
    201
  );
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new AppError('Invalid credentials', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  logger.info('User logged in', { userId: user._id, email: user.email });

  // Generate tokens
  const accessToken = generateAccessToken(user._id, user.email, user.role);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  user.refreshTokens.push({
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Limit stored refresh tokens to 5
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  // Remove password from output
  user.password = undefined;

  responseFormatter.success(res, {
    user,
    accessToken,
    refreshToken,
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  // Verify refresh token
  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production'
  );

  // Find user and check if refresh token exists
  const user = await User.findById(decoded.userId);
  if (!user || !user.isActive) {
    throw new AppError('Invalid refresh token', 401);
  }

  const tokenExists = user.refreshTokens.some((rt) => rt.token === refreshToken);
  if (!tokenExists) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Generate new access token
  const accessToken = generateAccessToken(user._id, user.email, user.role);

  logger.info('Token refreshed', { userId: user._id });

  responseFormatter.success(res, { accessToken });
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    // Remove refresh token from database
    const user = await User.findById(req.user.id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
      await user.save();
    }
  }

  // Blacklist access token in Redis
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    await redis.setex(`blacklist:${token}`, expiresIn, '1');
  }

  logger.info('User logged out', { userId: req.user.id });

  responseFormatter.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  responseFormatter.success(res, user);
});

/**
 * @desc    Change password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isPasswordCorrect) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;

  // Invalidate all refresh tokens
  user.refreshTokens = [];

  await user.save();

  logger.info('Password changed', { userId: user._id });

  responseFormatter.success(res, null, 'Password changed successfully');
});
