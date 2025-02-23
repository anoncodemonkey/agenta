import express from 'express';
import cors from 'cors';
import { sendTweet } from '../src/tweet.js';

const app = express();
app.use(cors());
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

// Start server if not running on Vercel
const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;
