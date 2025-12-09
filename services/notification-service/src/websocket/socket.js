const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('@nodecart/shared');

let io;
const userSockets = new Map(); // userId -> socket.id mapping

/**
 * Initialize WebSocket server
 */
const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      const decoded = jwt.verify(token, JWT_SECRET);

      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;

      next();
    } catch (error) {
      logger.error('WebSocket authentication failed', { error: error.message });
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', {
      userId: socket.userId,
      socketId: socket.id
    });

    // Store user socket mapping
    userSockets.set(socket.userId, socket.id);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', {
        userId: socket.userId,
        socketId: socket.id
      });
      userSockets.delete(socket.userId);
    });

    // Handle custom events
    socket.on('subscribe', (channel) => {
      socket.join(channel);
      logger.info('Client subscribed to channel', { userId: socket.userId, channel });
    });

    socket.on('unsubscribe', (channel) => {
      socket.leave(channel);
      logger.info('Client unsubscribed from channel', { userId: socket.userId, channel });
    });
  });

  logger.info('WebSocket server initialized');

  return io;
};

/**
 * Send notification to specific user
 */
const sendToUser = (userId, event, data) => {
  if (!io) {
    logger.error('WebSocket not initialized');
    return false;
  }

  io.to(`user:${userId}`).emit(event, data);
  logger.info('Notification sent to user', { userId, event });
  return true;
};

/**
 * Broadcast to all connected clients
 */
const broadcast = (event, data) => {
  if (!io) {
    logger.error('WebSocket not initialized');
    return false;
  }

  io.emit(event, data);
  logger.info('Notification broadcast', { event });
  return true;
};

/**
 * Send to specific channel
 */
const sendToChannel = (channel, event, data) => {
  if (!io) {
    logger.error('WebSocket not initialized');
    return false;
  }

  io.to(channel).emit(event, data);
  logger.info('Notification sent to channel', { channel, event });
  return true;
};

/**
 * Get connected users count
 */
const getConnectedUsersCount = () => {
  return userSockets.size;
};

/**
 * Check if user is connected
 */
const isUserConnected = (userId) => {
  return userSockets.has(userId);
};

module.exports = {
  initializeWebSocket,
  sendToUser,
  broadcast,
  sendToChannel,
  getConnectedUsersCount,
  isUserConnected,
};
