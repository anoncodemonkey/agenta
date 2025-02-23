import express from 'express';
import cors from 'cors';
import { sendTweet } from '../src/tweet.js';

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
    environment: process.env.NODE_ENV,
    hasTwitterCookies: !!process.env.TWITTER_COOKIES
  });
});

// Tweet endpoint
app.post('/tweet', async (req, res) => {
  try {

    const agentKey = req.header('AGENT_KEY');
    if (agentKey !== process.env.AGENT_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, password, text, replyTo } = req.body;
    if (!text && (!username || !password)) {
      return res.status(400).json({ error: 'Tweet text or username and password are required' });
    }

    const result = await sendTweet(username, password, text, replyTo);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Tweet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Documentation endpoint
app.get('/', (req, res) => {
  res.json({
    endpoints: {
      '/': 'This documentation',
      '/health': 'Health check endpoint',
      '/tweet': {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AGENT_KEY': 'Your agent key'
        },
        body: {
          username: 'Twitter username',
          password: 'Twitter password',
          text: 'Tweet text',
          replyTo: 'Optional tweet ID to reply to'
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server if not running on Vercel
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

// Export for Vercel
export default app;
