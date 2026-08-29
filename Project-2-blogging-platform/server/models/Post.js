const mongoose = require('mongoose');
const Comment = require('./Comment');

const postSchema = new mongoose.Schema({
  title:   { type: String, required: true, trim: true },
  content: { type: String, required: true },
  author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags:    [{ type: String, trim: true }]
}, { timestamps: true });

postSchema.index({ title: 'text', content: 'text' });

// Middleware: Automatically delete associated comments when a post is removed via deleteOne()
postSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    await Comment.deleteMany({ post: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Post', postSchema);