const express = require('express');
const router = express.Router();
const Thread = require('../models/Thread');
const auth = require('../middleware/auth');

// Create Thread
router.post('/', auth(), async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    const thread = new Thread({ title, content, tags, author: req.user.id });
    await thread.save();
    res.status(201).json(thread);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Search & Paginated Fetching
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, tag } = req.query;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (tag) {
      query.tags = tag;
    }

    const threads = await Thread.find(query)
      .populate('author', 'username reputation')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Thread.countDocuments(query);
    res.json({ threads, totalPages: Math.ceil(count / limit), currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Thread Detail
router.get('/:id', async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id).populate('author', 'username reputation');
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upvote/Downvote Thread
router.post('/:id/vote', auth(), async (req, res) => {
  const { voteType } = req.body;
  const userId = req.user.id;
  try {
    const thread = await Thread.findById(req.params.id);
    if (voteType === 'upvote') {
      thread.downvotes.pull(userId);
      if (thread.upvotes.includes(userId)) thread.upvotes.pull(userId);
      else thread.upvotes.push(userId);
    } else if (voteType === 'downvote') {
      thread.upvotes.pull(userId);
      if (thread.downvotes.includes(userId)) thread.downvotes.pull(userId);
      else thread.downvotes.push(userId);
    }
    thread.score = thread.upvotes.length - thread.downvotes.length;
    await thread.save();
    res.json(thread);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Thread (Moderator/Admin or Author)
router.delete('/:id', auth(), async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    if (thread.author.toString() !== req.user.id && !['mod', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    await thread.deleteOne();
    res.json({ message: 'Thread removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;