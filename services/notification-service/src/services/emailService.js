const transporter = require('../config/email');
const ejs = require('ejs');
const path = require('path');
const { logger } = require('@nodecart/shared');

class EmailService {
  /**
   * Send email
   */
  static async sendEmail(to, subject, html, text) {
    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'NodeCart'} <${process.env.EMAIL_FROM || 'noreply@nodecart.com'}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);

      logger.info('Email sent', { to, subject, messageId: info.messageId });

      return info;
    } catch (error) {
      logger.error('Failed to send email', { to, subject, error: error.message });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email, userData = {}) {
    const subject = 'Welcome to NodeCart!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to NodeCart! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi${userData.firstName ? ` ${userData.firstName}` : ''},</p>
            <p>Thank you for registering with NodeCart! We're excited to have you on board.</p>
            <p>Your account has been successfully created. You can now start shopping and enjoy our amazing products.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/products" class="button">Start Shopping</a>
            </p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy shopping!</p>
            <p>Best regards,<br>The NodeCart Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 NodeCart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmationEmail(email, orderData) {
    const subject = `Order Confirmation - ${orderData.orderNumber}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .order-details { background-color: white; padding: 15px; margin: 20px 0; border: 1px solid #ddd; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Confirmed! ✓</h1>
          </div>
          <div class="content">
            <p>Thank you for your order!</p>
            <div class="order-details">
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
              <p><strong>Total Amount:</strong> $${orderData.total}</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
            </div>
            <p>We'll send you another email when your order ships.</p>
            <p>Best regards,<br>The NodeCart Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 NodeCart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send payment confirmation email
   */
  static async sendPaymentConfirmationEmail(email, paymentData) {
    const subject = 'Payment Successful';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Successful! ✓</h1>
          </div>
          <div class="content">
            <p>Your payment has been processed successfully.</p>
            <p><strong>Amount:</strong> $${paymentData.amount}</p>
            <p><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>
            <p>Thank you for your payment!</p>
            <p>Best regards,<br>The NodeCart Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 NodeCart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send low stock alert email (admin)
   */
  static async sendLowStockAlert(email, productData) {
    const subject = `Low Stock Alert - ${productData.name}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Low Stock Alert</h1>
          </div>
          <div class="content">
            <p>The following product is running low on stock:</p>
            <p><strong>Product:</strong> ${productData.name}</p>
            <p><strong>Current Stock:</strong> ${productData.quantity}</p>
            <p><strong>Threshold:</strong> ${productData.threshold}</p>
            <p>Please restock soon to avoid going out of stock.</p>
            <p>Best regards,<br>NodeCart System</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 NodeCart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }
}

module.exports = EmailService;
