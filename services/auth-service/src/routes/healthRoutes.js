const express = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');

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
    service: 'auth-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: 'DOWN',
    redis: 'DOWN',
  };

  // Check MongoDB
  if (mongoose.connection.readyState === 1) {
    health.mongodb = 'UP';
  }

  // Check Redis
  try {
    await redis.ping();
    health.redis = 'UP';
  } catch (error) {
    // Redis is down
  }

  const statusCode = health.mongodb === 'UP' && health.redis === 'UP' ? 200 : 503;

  res.status(statusCode).json(health);
});

module.exports = router;
