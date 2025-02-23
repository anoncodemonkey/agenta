require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Tweeter Agent API' });
});

// Start server
app.listen(port, () => {
  console.log(`Tweeter agent server is running on port ${port}`);
});
