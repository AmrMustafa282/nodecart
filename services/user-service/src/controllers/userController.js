const User = require('../models/User');
const Address = require('../models/Address');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger
} = require('@nodecart/shared');

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
    include: [
      {
        model: Address,
        as: 'addresses',
      },
    ],
  });

  if (!user) {
    throw new AppError('User profile not found', 404);
  }

  responseFormatter.success(res, user);
});

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, dateOfBirth, preferences } = req.body;

  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User profile not found', 404);
  }

  // Update fields
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
  if (preferences !== undefined) {
    user.preferences = { ...user.preferences, ...preferences };
  }

  await user.save();

  logger.info('User profile updated', { userId: user.id });

  responseFormatter.success(res, user, 'Profile updated successfully');
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/users/profile
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User profile not found', 404);
  }

  // Soft delete
  user.isActive = false;
  await user.save();

  logger.info('User account deleted', { userId: user.id });

  responseFormatter.success(res, null, 'Account deleted successfully');
});

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [
      {
        model: Address,
        as: 'addresses',
      },
    ],
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  responseFormatter.success(res, user);
});

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;

  const offset = (page - 1) * limit;

  const where = {};
  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']],
  });

  responseFormatter.paginated(
    res,
    rows,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
    },
    'Users retrieved successfully'
  );
});
