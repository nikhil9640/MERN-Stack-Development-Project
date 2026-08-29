const express = require('express');
const router = express.Router();
const Reply = require('../models/Reply');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// Get Replies for a Thread
router.get('/thread/:threadId', async (req, res) => {
  try {
    const replies = await Reply.find({ thread: req.params.threadId })
      .populate('author', 'username reputation')
      .sort({ isAccepted: -1, createdAt: 1 });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Reply
router.post('/thread/:threadId', auth(), async (req, res) => {
  try {
    const { content } = req.body;
    const thread = await Thread.findById(req.params.threadId);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const reply = new Reply({
      thread: req.params.threadId,
      content,
      author: req.user.id
    });
    await reply.save();

    // Create Socket Notification for Thread Author
    if (thread.author.toString() !== req.user.id) {
      const notif = new Notification({
        recipient: thread.author,
        sender: req.user.id,
        thread: thread._id,
        message: `${req.user.username} replied to your thread: "${thread.title}"`
      });
      await notif.save();

      const io = req.app.get('socketio');
      io.to(thread.author.toString()).emit('notification', notif);
    }

    res.status(201).json(reply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Accept Answer
router.patch('/:id/accept', auth(), async (req, res) => {
  try {
    const reply = await Reply.findById(req.params.id);
    const thread = await Thread.findById(reply.thread);

    if (thread.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only thread author can accept an answer' });
    }

    await Reply.updateMany({ thread: reply.thread }, { isAccepted: false });
    reply.isAccepted = true;
    await reply.save();

    res.json(reply);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;