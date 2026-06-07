const mongoose = require('mongoose');
const Room = require('../models/Room');
const { logger } = require('../utils/logger');

function registerRoomHandlers(io, socket) {
  const userId = socket.user?.id;
  const username = socket.user?.username;

  socket.on('room:join', async ({ roomCode }) => {
    try {
      const targetCode = roomCode.toUpperCase();
      await Room.updateOne(
        { code: targetCode, 'participants.userId': { $ne: new mongoose.Types.ObjectId(userId) } },
        { $push: { participants: { userId: new mongoose.Types.ObjectId(userId), role: 'player', isReady: false, joinedAt: new Date() } } }
      );
      const room = await Room.findOne({ code: targetCode });
      if (!room) { socket.emit('room:error', { message: 'Room not found' }); return; }
      socket.join(room.code);
      socket.to(room.code).emit('room:presence', { userId, username, action: 'joined' });
      socket.emit('room:joined', { room });
    } catch (error) {
      socket.emit('room:error', { message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', async ({ roomCode }) => {
    try {
      socket.leave(roomCode);
      await Room.updateOne({ code: roomCode.toUpperCase() }, { $pull: { participants: { userId: new mongoose.Types.ObjectId(userId) } } });
      io.to(roomCode).emit('room:presence', { userId, username, action: 'left' });
    } catch (error) {
      socket.emit('room:error', { message: 'Failed to leave room' });
    }
  });

  socket.on('room:ready', async ({ roomCode, isReady }) => {
    try {
      await Room.updateOne({ code: roomCode, 'participants.userId': userId }, { $set: { 'participants.$.isReady': isReady } });
      io.to(roomCode).emit('room:state_update', { userId, isReady });
    } catch (error) {
      socket.emit('room:error', { message: 'Failed to update ready state' });
    }
  });

  socket.on('disconnect', async () => {
    if (!userId) return;
    try {
      const activeRooms = await Room.find({ 'participants.userId': userId });
      for (const room of activeRooms) {
        await Room.updateOne({ _id: room._id }, { $pull: { participants: { userId: new mongoose.Types.ObjectId(userId) } } });
        io.to(room.code).emit('room:presence', { userId, username, action: 'left' });
      }
    } catch (error) {
      logger.error('Disconnect cleanup failed', error);
    }
  });
}
module.exports = { registerRoomHandlers };
