const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  score: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index to optimize sorting by score in descending order
scoreSchema.index({ score: -1 });

module.exports = mongoose.model('Score', scoreSchema);
