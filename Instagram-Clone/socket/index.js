const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/keys');

// Track online users
const onlineUsers = new Map(); // userId -> Set of socketIds

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      socket.userId = payload._id;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Join personal room
    socket.join(userId);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Broadcast user came online
    socket.broadcast.emit('USER_ONLINE', { userId });

    console.log(`User connected: ${userId}`);

    // Handle typing indicators
    socket.on('TYPING', ({ receiverId }) => {
      io.to(receiverId).emit('USER_TYPING', { userId });
    });

    socket.on('STOP_TYPING', ({ receiverId }) => {
      io.to(receiverId).emit('USER_STOP_TYPING', { userId });
    });

    // Handle read receipts
    socket.on('MESSAGE_READ', ({ senderId }) => {
      io.to(senderId).emit('MESSAGES_READ', { readBy: userId });
    });

    // Get online users list
    socket.on('GET_ONLINE_USERS', () => {
      const onlineList = Array.from(onlineUsers.keys());
      socket.emit('ONLINE_USERS', { onlineUsers: onlineList });
    });

    socket.on('disconnect', () => {
      // Remove this socket from user's connections
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast user went offline
          socket.broadcast.emit('USER_OFFLINE', { userId });
        }
      }
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
};

module.exports = initializeSocket;
