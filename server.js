require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Score = require('./models/Score');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// API Routes
app.post('/api/scores', async (req, res) => {
  try {
    const { username, score } = req.body;
    if (!username || typeof score !== 'number') {
      return res.status(400).json({ message: 'Invalid data' });
    }

    const newScore = new Score({ username, score });
    await newScore.save();

    res.status(201).json({ message: 'Score saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.get('/api/scores/top', async (req, res) => {
  try {
    const topScores = await Score.find().sort({ score: -1 }).limit(10);
    res.json(topScores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
