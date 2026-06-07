const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function getDeviceInfo(req) { return req.headers['user-agent'] || 'Unknown Device'; }

router.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (existing) return res.status(409).json({ error: 'Username or email already in use' });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await User.create({ username, email, passwordHash });
    const { accessToken, refreshToken } = generateTokens(user.id, user.tokenVersion);
    await Session.create({ userId: user.id, refreshToken, deviceInfo: getDeviceInfo(req), ipAddress: req.ip || 'unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    res.status(201).json({ user: { id: user.id, username: user.username, email: user.email }, accessToken, refreshToken });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    const { accessToken, refreshToken } = generateTokens(user.id, user.tokenVersion);
    await Session.create({ userId: user.id, refreshToken, deviceInfo: getDeviceInfo(req), ipAddress: req.ip || 'unknown', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    res.status(200).json({ user: { id: user.id, username: user.username, email: user.email }, accessToken, refreshToken });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await Session.findOneAndDelete({ refreshToken });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) { next(error); }
});

router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
    await Session.deleteMany({ userId });
    res.status(200).json({ message: 'Logged out of all devices successfully' });
  } catch (error) { next(error); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });
    const session = await Session.findOne({ refreshToken });
    if (!session) return res.status(401).json({ error: 'Invalid refresh token' });
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ error: 'Token revoked. Please login again.' });
    }
    const tokens = generateTokens(user.id, user.tokenVersion);
    session.refreshToken = tokens.refreshToken;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();
    res.status(200).json(tokens);
  } catch (error) { res.status(401).json({ error: 'Invalid refresh token' }); }
});

module.exports = router;
