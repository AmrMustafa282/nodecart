const express = require('express');
const mongoose = require('mongoose');
const { getConnectedUsersCount } = require('../websocket/socket');

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
    service: 'notification-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: 'DOWN',
    websocket: {
      connectedUsers: getConnectedUsersCount(),
    },
  };

  // Check MongoDB
  if (mongoose.connection.readyState === 1) {
    health.mongodb = 'UP';
  }

  const statusCode = health.mongodb === 'UP' ? 200 : 503;

  res.status(statusCode).json(health);
});

module.exports = router;
