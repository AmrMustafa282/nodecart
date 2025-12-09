require('dotenv').config();
const app = require('./app');
const { logger } = require('@nodecart/shared');
const connectDB = require('./config/database');
const { initMinIO } = require('./config/minio');
const { subscribeToEvents } = require('./subscribers/productSubscriber');

const PORT = process.env.PORT || 3003;

// Initialize service
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize MinIO
    await initMinIO();

    // Subscribe to events
    await subscribeToEvents();

    const server = app.listen(PORT, () => {
      logger.info(`Product Service running on port ${PORT}`);
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
