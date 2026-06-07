const { logger } = require('../utils/logger');
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error: ' + err.message, err);
  if (err.code === 11000) {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}
module.exports = { errorHandler };
