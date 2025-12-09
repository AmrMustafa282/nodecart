const nodemailer = require('nodemailer');
const { logger } = require('@nodecart/shared');

// Create transporter for Mailhog (development) or SMTP (production)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'localhost',
  port: parseInt(process.env.EMAIL_PORT || 1025),
  secure: false, // Mailhog doesn't use TLS
  ignoreTLS: true,
  // For production SMTP:
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_PASSWORD,
  // },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email transporter verification failed', { error: error.message });
  } else {
    logger.info('Email transporter ready');
  }
});

module.exports = transporter;
