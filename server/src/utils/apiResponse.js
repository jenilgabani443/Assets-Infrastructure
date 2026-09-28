/**
 * Standardized API response helpers
 */

export const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

export const sendError = (res, message = 'Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null && errors !== undefined) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

export default {
  sendSuccess,
  sendError
};
