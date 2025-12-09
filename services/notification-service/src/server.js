require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initializeWebSocket } = require('./websocket/socket');
const { logger } = require('@nodecart/shared');
const connectDB = require('./config/database');
const { subscribeToEvents } = require('./subscribers/notificationSubscriber');

const PORT = process.env.PORT || 3006;

// Initialize service
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket
    initializeWebSocket(server);

    // Subscribe to events
    await subscribeToEvents();

    server.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
      logger.info(`WebSocket server running on same port`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Process terminated');
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

startServer();
