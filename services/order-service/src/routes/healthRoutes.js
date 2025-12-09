const express = require('express');
const sequelize = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', async (req, res) => {
  const health = {
    service: 'order-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'DOWN',
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.database = 'UP';
  } catch (error) {
    // Database is down
  }

  const statusCode = health.database === 'UP' ? 200 : 503;

  res.status(statusCode).json(health);
});

module.exports = router;
