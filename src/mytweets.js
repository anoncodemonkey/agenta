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
    const tweets = await scraper.getTweets(username, count);
    
    // Format the tweets for better readability
    const formattedTweets = tweets.map(tweet => ({
      id: tweet.id_str,
      text: tweet.full_text || tweet.text,
      created_at: tweet.created_at,
      retweet_count: tweet.retweet_count,
      favorite_count: tweet.favorite_count,
      reply_count: tweet.reply_count,
      is_retweet: !!tweet.retweeted_status,
      in_reply_to_status_id: tweet.in_reply_to_status_id_str,
      in_reply_to_screen_name: tweet.in_reply_to_screen_name
    }));

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