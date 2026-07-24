/**
 * Middleware to sanitize user input and prevent NoSQL/MongoDB Injection
 * It recursively removes any keys starting with "$" from req.body, req.query, and req.params
 */
const sanitize = (obj) => {
  if (obj && typeof obj === 'object') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    }
  }
  return obj;
};

export const nosqlSanitize = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

export default nosqlSanitize;
