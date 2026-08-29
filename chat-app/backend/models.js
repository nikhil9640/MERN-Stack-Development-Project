const mongoose = require('mongoose');

// Schema for tracking individual recipient receipt records
const ReceiptSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  deliveryState: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// Core Message Storage Model
const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // Links to ChatRoom string representations
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: [ReceiptSchema]
});

// Compound Indexing for fast chronological pagination reads
MessageSchema.index({ roomId: 1, timestamp: 1 });

// Chat Room Container Schema
const ChatRoomSchema = new mongoose.Schema({
  roomName: { type: String, default: 'New Chat' },
  isGroup: { type: Boolean, default: false },
  participants: [{ type: String }], // Array of User IDs
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);
const ChatRoom = mongoose.model('ChatRoom', ChatRoomSchema);

module.exports = { Message, ChatRoom };