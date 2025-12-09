const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const esTransportOpts = {
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 5,
    requestTimeout: 10000,
  },
  indexPrefix: process.env.SERVICE_NAME || 'nodecart',
};

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaString}`;
      })
    ),
  }),
];

// Add Elasticsearch transport in production
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_ELK === 'true') {
  transports.push(new ElasticsearchTransport(esTransportOpts));
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'nodecart-service',
  },
  transports,
});

// Create child logger with correlation ID
logger.withCorrelationId = (correlationId) => {
  return logger.child({ correlationId });
};

module.exports = logger;
