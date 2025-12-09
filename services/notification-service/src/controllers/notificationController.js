const Notification = require('../models/Notification');
const { sendToUser } = require('../websocket/socket');
const {
  AppError,
  asyncHandler,
  responseFormatter,
  logger
} = require('@nodecart/shared');

/**
 * @desc    Get all notifications for user
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  const query = { userId: req.user.id };

  if (status) {
    query.status = status;
  }

  const [notifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(parseInt(limit))
      .lean(),
    Notification.countDocuments(query),
  ]);

  responseFormatter.paginated(
    res,
    notifications,
    {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    },
    'Notifications retrieved successfully'
  );
});

/**
 * @desc    Get single notification
 * @route   GET /api/notifications/:id
 * @access  Private
 */
exports.getNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  responseFormatter.success(res, notification);
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.status = 'read';
  notification.readAt = new Date();
  await notification.save();

  logger.info('Notification marked as read', { notificationId: notification._id });

  responseFormatter.success(res, notification, 'Notification marked as read');
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user.id, status: { $ne: 'read' } },
    { status: 'read', readAt: new Date() }
  );

  logger.info('All notifications marked as read', { userId: req.user.id, count: result.modifiedCount });

  responseFormatter.success(res, { count: result.modifiedCount }, 'All notifications marked as read');
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  await notification.deleteOne();

  logger.info('Notification deleted', { notificationId: req.params.id });

  responseFormatter.success(res, null, 'Notification deleted');
});

/**
 * @desc    Get unread notifications count
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user.id,
    status: { $ne: 'read' },
  });

  responseFormatter.success(res, { count });
});

/**
 * @desc    Send test notification (development)
 * @route   POST /api/notifications/test
 * @access  Private
 */
exports.sendTestNotification = asyncHandler(async (req, res) => {
  const { message } = req.body;

  // Create notification
  const notification = await Notification.create({
    userId: req.user.id,
    type: 'websocket',
    channel: 'general',
    message: message || 'This is a test notification',
    status: 'sent',
    sentAt: new Date(),
  });

  // Send via WebSocket
  sendToUser(req.user.id, 'notification', {
    id: notification._id,
    message: notification.message,
    timestamp: notification.createdAt,
  });

  logger.info('Test notification sent', { userId: req.user.id });

  responseFormatter.success(res, notification, 'Test notification sent');
});
