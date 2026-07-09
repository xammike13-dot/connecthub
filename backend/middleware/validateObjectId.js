import { isValidObjectId } from 'mongoose';

/**
 * Middleware to validate MongoDB ObjectId parameters
 * Prevents BSON errors from invalid IDs like "me"
 * 
 * Usage: router.get('/:id', validateObjectId('id'), controller);
 * Or: router.get('/:id', validateObjectId(['id', 'landlordId']), controller);
 */
export const validateObjectId = (...paramNames) => {
  // Flatten array if passed
  const params = paramNames.flat();
  
  return (req, res, next) => {
    for (const paramName of params) {
      const value = req.params[paramName];
      
      if (value && !isValidObjectId(value)) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${paramName}: "${value}" is not a valid MongoDB ObjectId`
        });
      }
    }
    next();
  };
};

/**
 * Alternative export as default for cleaner imports
 */
export default validateObjectId;