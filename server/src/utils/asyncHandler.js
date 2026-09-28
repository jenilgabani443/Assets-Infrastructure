/**
 * Async handler utility to wrap controller methods and catch rejected promises
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
