import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
//import Redis from 'ioredis';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

// Load environment variables
const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;

// Connect to MongoDB


// Optional Redis setup
// let redis;
//  try {
//    redis = new Redis();
// } catch (err) {
//    console.warn("⚠️ Redis connection failed:", err.message);
//  }

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Socket.io middleware for auth
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization
        ? socket.handshake.headers.authorization.split(' ')[1]
        : undefined);

    // ...rest of your middleware code...

    const projectId = socket.handshake.query.projectId;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error('Invalid projectId'));
    }

    socket.project = await projectModel.findById(projectId);

    if (!token || !jwtSecret) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded) {
      return next(new Error('Authentication error'));
    }

    socket.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  socket.roomId = socket.project._id.toString();
  console.log('✅ User connected');
  socket.join(socket.roomId);

  socket.on('project-message', async (data) => {
    const message = data.message;
    const aiIsPresent = message.includes('@ai');

    socket.broadcast.to(socket.roomId).emit('project-message', data);

    if (aiIsPresent) {
      const prompt = message.replace('@ai', '');
      const result = await generateResult(prompt);

      io.to(socket.roomId).emit('project-message', {
        message: result,
        sender: {
          _id: 'ai',
          email: 'AI',
        },
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected');
    socket.leave(socket.roomId);
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});