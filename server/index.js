// Server entry point
require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSockets } = require('./sockets/index');
const { logger } = require('./utils/logger');

const app = express();
const httpServer = createServer(app);
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: { origin: clientOrigin, methods: ['GET', 'POST'], credentials: true },
});

app.use(cors({ origin: [clientOrigin, 'http://127.0.0.1:3000', 'http://localhost:3000'], credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'BrainStorm Arena API is running' });
});

setupSockets(io);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    if (process.env.MONGO_URI) {
      logger.info('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGO_URI);
      logger.info('Connected to MongoDB!');
    } else {
      logger.warn('MONGO_URI not set — skipping MongoDB connection');
    }
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
