import Boom from '@hapi/boom';
import { logger, session } from './logger.js';

// Express helper to handle async route errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware to bind request correlation IDs
const requestContextMiddleware = (req, res, next) => {
  session.run(() => {
    const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    session.set('requestId', requestId);
    next();
  });
};

// Global Express Error Handling Middleware for standardizing API errors
const errorHandlerMiddleware = (err, req, res, next) => {
  if (Boom.isBoom(err)) {
    logger.error(`Boom Error: ${err.message}`, {
      statusCode: err.output.statusCode,
      payload: err.output.payload,
      stack: err.stack
    });
    return res.status(err.output.statusCode).json(err.output.payload);
  }

  logger.error(`Unhandled Internal Server Error: ${err.message}`, { stack: err.stack });
  const internalError = Boom.internal('An unexpected error occurred');
  return res.status(internalError.output.statusCode).json(internalError.output.payload);
};

export { asyncHandler, requestContextMiddleware, errorHandlerMiddleware };
