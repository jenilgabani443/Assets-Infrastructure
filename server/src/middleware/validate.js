import { validationResult } from 'express-validator';

/**
 * Middleware generator for express-validator rule chains
 * Produces standardized field-level error responses:
 * {
 *   success: false,
 *   message: 'Validation failed',
 *   errors: [ { field: 'email', message: 'Invalid email address' } ]
 * }
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  };
};

export default validate;
