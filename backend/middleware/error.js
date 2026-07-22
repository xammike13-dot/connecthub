import SystemLog from '../models/SystemLog.js';

console.log('Loading middleware/error.js');
export class ResponseError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ResponseError';
  }
}

export const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new Error(message);
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new Error(message.join(', '));
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new Error(message);
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new Error(message);
    error.statusCode = 401;
  }

  const statusCode = error.statusCode || err.statusCode || 500;
  const errorMessage = error.message || err.message || 'Server Error';

  // Log the failed API request (4xx or 5xx response) into MongoDB
  // We do this asynchronously without awaiting so it doesn't block the client response
  try {
    SystemLog.create({
      type: statusCode >= 500 ? 'unhandled_error' : 'api_error',
      message: errorMessage,
      details: {
        stack: err.stack,
        errorName: err.name,
        errorCode: err.code
      },
      statusCode,
      path: req.originalUrl || req.path,
      method: req.method,
      user: req.user?._id || null,
      ip: req.ip || req.headers['x-forwarded-for'] || null
    }).catch(e => console.error('Failed to write SystemLog inside errorHandler:', e.message));
  } catch (logErr) {
    console.error('Failed to log error inside errorHandler:', logErr.message);
  }

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
};

export default errorHandler;
