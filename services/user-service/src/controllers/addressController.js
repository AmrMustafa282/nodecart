const Address = require('../models/Address');
const User = require('../models/User');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger
} = require('@nodecart/shared');

/**
 * @desc    Get all addresses for user
 * @route   GET /api/addresses
 * @access  Private
 */
exports.getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const addresses = await Address.findAll({
    where: { userId: user.id },
    order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
  });

  responseFormatter.success(res, addresses);
});

/**
 * @desc    Get single address
 * @route   GET /api/addresses/:id
 * @access  Private
 */
exports.getAddress = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const address = await Address.findOne({
    where: {
      id: req.params.id,
      userId: user.id,
    },
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  responseFormatter.success(res, address);
});

/**
 * @desc    Create new address
 * @route   POST /api/addresses
 * @access  Private
 */
exports.createAddress = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const {
    type,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    isDefault,
  } = req.body;

  // If this is set as default, unset other defaults
  if (isDefault) {
    await Address.update(
      { isDefault: false },
      { where: { userId: user.id } }
    );
  }

  const address = await Address.create({
    userId: user.id,
    type,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    isDefault: isDefault || false,
  });

  logger.info('Address created', { userId: user.id, addressId: address.id });

  responseFormatter.success(res, address, 'Address created successfully', 201);
});

/**
 * @desc    Update address
 * @route   PUT /api/addresses/:id
 * @access  Private
 */
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const address = await Address.findOne({
    where: {
      id: req.params.id,
      userId: user.id,
    },
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  const {
    type,
    fullName,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country,
    isDefault,
  } = req.body;

  // If setting as default, unset other defaults
  if (isDefault && !address.isDefault) {
    await Address.update(
      { isDefault: false },
      { where: { userId: user.id } }
    );
  }

  // Update fields
  if (type !== undefined) address.type = type;
  if (fullName !== undefined) address.fullName = fullName;
  if (phone !== undefined) address.phone = phone;
  if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
  if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
  if (city !== undefined) address.city = city;
  if (state !== undefined) address.state = state;
  if (postalCode !== undefined) address.postalCode = postalCode;
  if (country !== undefined) address.country = country;
  if (isDefault !== undefined) address.isDefault = isDefault;

  await address.save();

  logger.info('Address updated', { addressId: address.id });

  responseFormatter.success(res, address, 'Address updated successfully');
});

/**
 * @desc    Delete address
 * @route   DELETE /api/addresses/:id
 * @access  Private
 */
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    where: { authUserId: req.user.id },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const address = await Address.findOne({
    where: {
      id: req.params.id,
      userId: user.id,
    },
  });

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  await address.destroy();

  logger.info('Address deleted', { addressId: req.params.id });

  responseFormatter.success(res, null, 'Address deleted successfully');
});
