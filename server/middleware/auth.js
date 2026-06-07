const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId).select('tokenVersion role');
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ error: 'Token revoked. Please login again.' });
    }
    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
module.exports = { requireAuth };
