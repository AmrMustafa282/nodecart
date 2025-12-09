const Minio = require('minio');
const { logger } = require('@nodecart/shared');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const bucketName = process.env.MINIO_BUCKET || 'products';

/**
 * Initialize MinIO bucket
 */
const initMinIO = async () => {
  try {
    // Check if bucket exists
    const exists = await minioClient.bucketExists(bucketName);

    if (!exists) {
      // Create bucket
      await minioClient.makeBucket(bucketName, 'us-east-1');
      logger.info('MinIO bucket created', { bucket: bucketName });

      // Set bucket policy for public read
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      logger.info('MinIO bucket policy set', { bucket: bucketName });
    } else {
      logger.info('MinIO bucket already exists', { bucket: bucketName });
    }
  } catch (error) {
    logger.error('Failed to initialize MinIO', { error: error.message });
    throw error;
  }
};

/**
 * Upload file to MinIO
 */
const uploadFile = async (file, filename) => {
  try {
    const objectName = `${Date.now()}-${filename}`;

    await minioClient.putObject(
      bucketName,
      objectName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      }
    );

    const url = `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}/${bucketName}/${objectName}`;

    logger.info('File uploaded to MinIO', { objectName, url });

    return { objectName, url };
  } catch (error) {
    logger.error('Failed to upload file to MinIO', { error: error.message });
    throw error;
  }
};

/**
 * Delete file from MinIO
 */
const deleteFile = async (objectName) => {
  try {
    await minioClient.removeObject(bucketName, objectName);
    logger.info('File deleted from MinIO', { objectName });
  } catch (error) {
    logger.error('Failed to delete file from MinIO', { error: error.message });
    throw error;
  }
};

module.exports = {
  minioClient,
  bucketName,
  initMinIO,
  uploadFile,
  deleteFile,
};
