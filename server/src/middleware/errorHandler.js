/**
 * Centralized Express Error Handler
 * Standard format: { success: false, message: string, errors?: array }
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || res.statusCode;
  if (!statusCode || statusCode < 400) {
    statusCode = 500;
  }

  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'field';
    const duplicatedValue = err.keyValue ? err.keyValue[duplicatedField] : '';
    message = `Duplicate value '${duplicatedValue}' for ${duplicatedField}. Must be unique.`;
  }

  // Handle Mongoose Invalid ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid resource identifier format: ${err.value}`;
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  const response = {
    success: false,
    message
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV === 'development' && statusCode === 500 && err.stack) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
