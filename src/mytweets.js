import { Scraper } from 'agent-twitter-client';
import { fileURLToPath } from 'url';
import { loadCookies } from './shared/cookies.js';

/**
 * Get latest tweets for a user
 * @param {string} username - Twitter username
 * @param {number} count - Number of tweets to fetch (default: 20)
 * @returns {Promise<Array>} Array of tweets
 */
export async function getLatestTweets(username, count = 20) {
  try {
    console.log(`[${new Date().toISOString()}] Getting latest ${count} tweets for ${username}`);
    const scraper = new Scraper({
      debug: true,
      timeout: 60000,
      retries: 3
    });

    // Try to use existing cookies
    const cookies = await loadCookies(username);
    if (cookies && cookies.length > 0) {
      console.log(`Found ${cookies.length} saved cookies, using them...`);
      await scraper.setCookies(cookies);
    } else {
      console.log('No saved cookies found');
      throw new Error('No saved cookies found. Please login first using non.js');
    }

    // Get user tweets
    console.log(`Fetching ${count} latest tweets for ${username}...`);
    const tweetsGenerator = await scraper.getTweets(username, count);
    
    // Collect tweets from generator
    const tweets = [];
    for await (const tweet of tweetsGenerator) {
      tweets.push(tweet);
      if (tweets.length >= count) break;
    }
    
    console.log(`Fetched ${tweets.length} tweets`);
    if (tweets.length > 0) {
      console.log('Sample tweet structure:', JSON.stringify(tweets[0], null, 2));
    }
    
    // Format the tweets for better readability
    const formatTweet = tweet => ({
      id: tweet.id,
      conversation_id: tweet.conversationId,
      text: tweet.text,
      html: tweet.html,
      author: {
        id: tweet.userId,
        username: tweet.username,
        name: tweet.name
      },
      metrics: {
        replies: tweet.replies,
        retweets: tweet.retweets,
        likes: tweet.likes,
        views: tweet.views,
        bookmarks: tweet.bookmarkCount
      },
      flags: {
        is_retweet: tweet.isRetweet,
        is_reply: tweet.isReply,
        is_quote: tweet.isQuoted,
        is_pinned: tweet.isPin,
        has_sensitive_content: tweet.sensitiveContent
      },
      media: {
        photos: tweet.photos || [],
        videos: tweet.videos || []
      },
      metadata: {
        urls: tweet.urls || [],
        mentions: tweet.mentions || [],
        hashtags: tweet.hashtags || [],
        thread: tweet.thread || []
      },
      permanent_url: tweet.permanentUrl,
      created_at: tweet.timeParsed,
      timestamp: tweet.timestamp
    });

    // Handle both single tweet and array of tweets
    const formattedTweets = Array.isArray(tweets) 
      ? tweets.map(formatTweet)
      : tweets ? [formatTweet(tweets)] : [];

    console.log(`Successfully fetched ${formattedTweets.length} tweets`);
    return formattedTweets;

  } catch (error) {
    console.error('Error getting tweets:', error);
    throw error;
  }
}

// Execute the function only if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [username, countStr] = process.argv.slice(2);
  const count = parseInt(countStr) || 20;
  
  if (!username) {
    console.log('Usage: node mytweets.js <username> [count]');
    process.exit(1);
  }

  getLatestTweets(username, count).then(tweets => {
    console.log(JSON.stringify(tweets, null, 2));
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}