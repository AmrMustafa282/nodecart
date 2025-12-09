const express = require('express');
const mongoose = require('mongoose');
const { minioClient, bucketName } = require('../config/minio');

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
    service: 'product-service',
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: 'DOWN',
    minio: 'DOWN',
  };

  // Check MongoDB
  if (mongoose.connection.readyState === 1) {
    health.mongodb = 'UP';
  }

  // Check MinIO
  try {
    await minioClient.bucketExists(bucketName);
    health.minio = 'UP';
  } catch (error) {
    // MinIO is down
  }

  const statusCode = health.mongodb === 'UP' && health.minio === 'UP' ? 200 : 503;

  res.status(statusCode).json(health);
});

module.exports = router;
