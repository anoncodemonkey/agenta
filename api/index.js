import express from 'express';
import cors from 'cors';
import { sendTweet } from '../src/tweet.js';
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
app.post('/tweet', async (req, res) => {
  try {

    const agentKey = req.header('AGENT_KEY');
    console.log('Received AGENT_KEY:', agentKey);
    
    if (agentKey !== process.env.AGENT_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, password, email, text, replyTo } = req.body;
    if (!text && (!username || !password)) {
      return res.status(400).json({ error: 'Tweet text or username and password are required' });
    }

    const result = await sendTweet(username, password, email, text, replyTo);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Tweet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Documentation endpoint
app.get('/', (req, res) => {
  console.log('Serving documentation!');
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Export for Vercel
export default app;
