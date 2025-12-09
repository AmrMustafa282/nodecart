const amqp = require('amqplib');
const logger = require('../logger/logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'nodecart_events';
    this.reconnectTimeout = 5000;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });

      logger.info('Connected to RabbitMQ', { exchange: this.exchange });

      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, reconnecting...');
        this.reconnect();
      });

      return this.channel;
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error: error.message });
      this.reconnect();
      throw error;
    }
  }

  /**
   * Reconnect to RabbitMQ
   */
  async reconnect() {
    setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ...');
      this.connect().catch(() => {
        // Retry handled by setTimeout
      });
    }, this.reconnectTimeout);
  }

  /**
   * Publish event to exchange
   * @param {string} eventType - Event type (routing key)
   * @param {Object} data - Event data
   */
  async publish(eventType, data) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const message = JSON.stringify({
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'unknown',
      });

      this.channel.publish(this.exchange, eventType, Buffer.from(message), {
        persistent: true,
        contentType: 'application/json',
      });

      logger.info('Event published', { eventType, data });
    } catch (error) {
      logger.error('Failed to publish event', { eventType, error: error.message });
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param {string} queueName - Queue name
   * @param {string[]} eventTypes - Array of event types to subscribe
   * @param {Function} handler - Message handler function
   */
  async subscribe(queueName, eventTypes, handler) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      // Create dead letter exchange
      const dlxExchange = `${this.exchange}_dlx`;
      await this.channel.assertExchange(dlxExchange, 'topic', { durable: true });

      // Create dead letter queue
      const dlq = `${queueName}_dlq`;
      await this.channel.assertQueue(dlq, { durable: true });
      await this.channel.bindQueue(dlq, dlxExchange, '#');

      // Create main queue with DLX
      await this.channel.assertQueue(queueName, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': dlxExchange,
          'x-message-ttl': 86400000, // 24 hours
        },
      });

      // Bind queue to event types
      for (const eventType of eventTypes) {
        await this.channel.bindQueue(queueName, this.exchange, eventType);
        logger.info('Subscribed to event', { queueName, eventType });
      }

      // Set prefetch count
      await this.channel.prefetch(1);

      // Consume messages
      await this.channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              logger.info('Event received', {
                queueName,
                eventType: content.eventType,
                data: content.data
              });

              // Process message with retry logic
              await this.processWithRetry(handler, content, msg);

              // Acknowledge message
              this.channel.ack(msg);
            } catch (error) {
              logger.error('Failed to process event', {
                queueName,
                error: error.message,
              });

              // Check retry count
              const retryCount = (msg.properties.headers?.['x-retry-count'] || 0);

              if (retryCount < 3) {
                // Retry with delay
                setTimeout(() => {
                  this.channel.nack(msg, false, true);
                }, Math.pow(2, retryCount) * 1000); // Exponential backoff
              } else {
                // Send to DLQ
                logger.error('Max retries reached, sending to DLQ', { queueName });
                this.channel.nack(msg, false, false);
              }
            }
          }
        },
        { noAck: false }
      );

      logger.info('Consumer started', { queueName, eventTypes });
    } catch (error) {
      logger.error('Failed to subscribe to events', { error: error.message });
      throw error;
    }
  }

  /**
   * Process message with retry logic
   */
  async processWithRetry(handler, content, msg, maxRetries = 3) {
    let lastError;
    const retryCount = msg.properties.headers?.['x-retry-count'] || 0;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        await handler(content.data, content);
        return; // Success
      } catch (error) {
        lastError = error;

        if (i < maxRetries) {
          const delay = Math.pow(2, i) * 1000;
          logger.warn(`Retry attempt ${i + 1}/${maxRetries}`, {
            delay,
            error: error.message,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Update retry count in headers
    msg.properties.headers = msg.properties.headers || {};
    msg.properties.headers['x-retry-count'] = retryCount + 1;

    throw lastError;
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection', { error: error.message });
    }
  }
}

module.exports = EventBus;
