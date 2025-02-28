import express from 'express';
import cors from 'cors';
import { sendTweet } from '../src/tweet.js';
import { getLatestTweets } from '../src/mytweets.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'], // Allow specific methods
  allowedHeaders: ['Content-Type', 'AGENT_KEY'] // Allow our custom header
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    hasTwitterCookies: false,
    timestamp: new Date().toISOString()
  });
});

// Tweet endpoint
app.post('/tweet', validateAgentKey, async (req, res) => {
  try {
    const { username, password, text, replyTo } = req.body;
    
    if (!username || !password || !text) {
      return res.status(400).json({ error: 'Tweet text or username and password are required' });
    }

    const result = await sendTweet(username, password, null, text, replyTo);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Tweet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest tweets endpoint
app.get('/tweets/:username', validateAgentKey, async (req, res) => {
  try {
    const { username } = req.params;
    const count = parseInt(req.query.count) || 20;

    console.log(`Getting ${count} latest tweets for ${username}`);
    const tweets = await getLatestTweets(username, count);
    res.json({ tweets });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Something broke!' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Export for Vercel
export default app;

function validateAgentKey(req, res, next) {
  const agentKey = req.header('AGENT_KEY');
  if (agentKey !== process.env.AGENT_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
