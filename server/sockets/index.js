const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { logger } = require('../utils/logger');
const { registerRoomHandlers } = require('./roomHandler');

function setupSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: no token'));
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.userId).select('username tokenVersion');
      if (!user || user.tokenVersion !== payload.tokenVersion) return next(new Error('Invalid token'));
      socket.user = { id: user.id, username: user.username };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user?.username} (${socket.id})`);
    registerRoomHandlers(io, socket);
    socket.on('disconnect', () => { logger.info(`Socket disconnected: ${socket.user?.username} (${socket.id})`); });
  });
}
module.exports = { setupSockets };
