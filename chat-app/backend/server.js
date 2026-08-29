const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const { Message, ChatRoom } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

mongoose.connect('mongodb://127.0.0.1:27017/chatapp_db')
  .then(() => console.log('Connected securely to MongoDB.'))
  .catch(err => console.error('Database connection failure:', err));

// Global tracker matrix mapping active User IDs to their Socket IDs for presence indicators
const activeUsers = new Map(); 

async function seedDefaultRooms() {
  const count = await ChatRoom.countDocuments();
  if (count === 0) {
    await ChatRoom.create([
      { roomName: 'Global General Room', isGroup: true, participants: [] },
      { roomName: 'Private: Alice & Bob', isGroup: false, participants: [] }
    ]);
    console.log('Database seeded with standard conversation channels.');
  }
}
seedDefaultRooms();

io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  const username = socket.handshake.auth.username;
  if (!userId) return next(new Error("Authentication failure: Invalid User ID"));
  socket.userId = userId;
  socket.username = username;
  next();
});

io.on('connection', (socket) => {
  console.log(`📡 User connected: ${socket.username} (${socket.userId})`);
  
  // Track user presence
  activeUsers.set(socket.userId, { username: socket.username, socketId: socket.id });
  io.emit('online_users_list', Array.from(activeUsers.keys()));

  // Send available rooms to the client upon initialization
  socket.on('get_initial_rooms', async () => {
    try {
      const dbRooms = await ChatRoom.find({});
      const formattedRooms = dbRooms.map(r => ({ id: r._id.toString(), name: r.roomName, isGroup: r.isGroup }));
      socket.emit('rooms_list', formattedRooms);
    } catch (err) {
      console.error(err);
    }
  });

  // [Option A]: Create a dynamic chat room
  socket.on('create_room', async ({ roomName }) => {
    try {
      if (!roomName.trim()) return;
      const newRoom = await ChatRoom.create({ roomName: roomName.trim(), isGroup: true, participants: [] });
      
      // Broadcast the updated rooms array globally to all connected socket nodes
      const dbRooms = await ChatRoom.find({});
      const formattedRooms = dbRooms.map(r => ({ id: r._id.toString(), name: r.roomName, isGroup: r.isGroup }));
      io.emit('rooms_list', formattedRooms);
    } catch (err) {
      console.error('Failed to create room:', err);
    }
  });

  // [Option C]: Paginated chat histories using skip offsets
  socket.on('join_room', async ({ roomId, skip = 0 }) => {
    socket.join(roomId);
    try {
      // Limit to 20 per page payload for clearer verification checks
      const limitCount = 20; 
      const history = await Message.find({ roomId })
        .sort({ timestamp: -1 }) // Sort newest first to apply pagination skipping correctly
        .skip(skip)
        .limit(limitCount);
      
      // Reverse history back to linear chronological ordering before shipping
      socket.emit('message_history', { roomId, history: history.reverse(), hasMore: history.length === limitCount });

      await Message.updateMany(
        { roomId, senderId: { $ne: socket.userId }, 'status.userId': { $ne: socket.userId } },
        { $push: { status: { userId: socket.userId, deliveryState: 'seen', updatedAt: new Date() } } }
      );
      io.to(roomId).emit('room_messages_seen', { roomId, userId: socket.userId });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('send_message', async ({ roomId, text }) => {
    try {
      const newMessage = new Message({
        roomId,
        senderId: socket.userId,
        senderName: socket.username,
        text,
        status: []
      });
      const savedMsg = await newMessage.save();
      io.to(roomId).emit('new_message', savedMsg);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('msg_seen', async ({ msgId, roomId, userId }) => {
    try {
      await Message.updateOne(
        { _id: msgId, 'status.userId': { $ne: userId } },
        { $push: { status: { userId, deliveryState: 'seen', updatedAt: new Date() } } }
      );
      io.to(roomId).emit('status_update', { msgId, status: 'seen', userId });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user_typing', { username: socket.username });
  });

  socket.on('stop_typing', ({ roomId }) => {
    socket.to(roomId).emit('user_stop_typing', { username: socket.username });
  });

  // [Option B]: Handle user disconnect presence tracking
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.username}`);
    activeUsers.delete(socket.userId);
    io.emit('online_users_list', Array.from(activeUsers.keys()));
  });
});

server.listen(3001, () => {
  console.log('🚀 WebSocket server running on port 3001');
});