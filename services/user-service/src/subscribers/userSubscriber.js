const { EventBus, eventTypes, logger } = require('@nodecart/shared');
const User = require('../models/User');

const eventBus = new EventBus();

/**
 * Subscribe to user-related events
 */
const subscribeToEvents = async () => {
  try {
    await eventBus.connect();

    // Subscribe to user.registered event from auth service
    await eventBus.subscribe(
      'user-service-queue',
      [eventTypes.USER_REGISTERED],
      async (data) => {
        await handleUserRegistered(data);
      }
    );

    logger.info('User service subscribed to events');
  } catch (error) {
    logger.error('Failed to subscribe to events', { error: error.message });
  }
};

/**
 * Handle user.registered event
 * Create user profile when user registers in auth service
 */
const handleUserRegistered = async (data) => {
  try {
    const { userId, email, role } = data;

    logger.info('Processing user.registered event', { userId, email });

    // Check if user profile already exists
    const existingUser = await User.findOne({
      where: { authUserId: userId },
    });

    if (existingUser) {
      logger.warn('User profile already exists', { userId });
      return;
    }

    // Create user profile
    await User.create({
      authUserId: userId,
      email,
      preferences: {
        newsletter: true,
        notifications: true,
        language: 'en',
        currency: 'USD',
      },
    });

    logger.info('User profile created', { userId, email });
  } catch (error) {
    logger.error('Failed to handle user.registered event', { error: error.message });
    throw error; // Trigger retry
  }
};

module.exports = { subscribeToEvents };
