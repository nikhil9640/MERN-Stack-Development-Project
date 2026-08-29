const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const auth = require('../middleware/auth');

// GET Comments for a specific post
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE Comment (Protected)
router.post('/:postId', auth, async (req, res) => {
  try {
    const comment = new Comment({
      post: req.params.postId,
      author: req.user.userId,
      text: req.body.text // Fixed key matching frontend
    });
    await comment.save();
    const populated = await comment.populate('author', 'username');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;