require('dotenv').config();
const app = require('./app');
const { logger } = require('@nodecart/shared');
const sequelize = require('./config/database');
const { subscribeToEvents } = require('./subscribers/orderSubscriber');

const PORT = process.env.PORT || 3004;

// Initialize database
const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('MariaDB connected');

    // Sync models (use migrations in production)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced');
    }
  } catch (error) {
    logger.error('Database connection failed', { error: error.message });
    process.exit(1);
  }
};

// Initialize service
const startServer = async () => {
  await initDatabase();
  await subscribeToEvents();

  const server = app.listen(PORT, () => {
    logger.info(`Order Service running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      logger.info('Process terminated');
      sequelize.close();
    });
  });
};

startServer();
