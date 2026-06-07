const jwt = require('jsonwebtoken');

function generateTokens(userId, tokenVersion) {
  const accessSecret = process.env.JWT_ACCESS_SECRET || 'access_secret';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

  const accessToken = jwt.sign({ userId, tokenVersion }, accessSecret, { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign({ userId, tokenVersion }, refreshSecret, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'access_secret');
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
}

module.exports = { generateTokens, verifyAccessToken, verifyRefreshToken };
