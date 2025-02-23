import { Scraper } from 'agent-twitter-client';
import { saveCookies, loadCookies } from './shared/cookies.js';

/**
 * Send a tweet using the provided credentials
 * @param {string} username - Twitter username
 * @param {string} password - Twitter password
 * @param {string} email - Twitter account email
 * @param {string} tweetText - Text to tweet
 * @param {string} replyToId - Optional tweet ID to reply to
 * @returns {Promise<Object>} Tweet response data
 */
export async function sendTweet(username, password, email, tweetText, replyToId = null) {
  try {
    console.log(`[${new Date().toISOString()}] Initializing tweet process for ${username}`);
    const scraper = new Scraper({
      debug: true,
      timeout: 60000,
      retries: 3
    });

    // 1. Try to use existing cookies first
    let isAuthenticated = false;
    const cookies = await loadCookies(username);
    
    if (cookies && cookies.length > 0) {
      console.log(`Found ${cookies.length} saved cookies, attempting to use them...`);
      await scraper.setCookies(cookies);
      
      try {
        // Check if cookies are valid
        const me = await scraper.me();
        if (me && me.screen_name) {
          console.log("Successfully authenticated with saved cookies as:", me.screen_name);
          isAuthenticated = true;
        }
      } catch (error) {
        console.log("Saved cookies are invalid, will do fresh login");
      }
    }

    // 2. Send the tweet
    console.log("Preparing to send tweet:", tweetText, replyToId ? `in reply to ${replyToId}` : '');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const sendTweetResults = await scraper.sendTweet(tweetText, replyToId);
      console.log("Send tweet results:", JSON.stringify(sendTweetResults, null, 2));
      
      // Save any updated cookies
      const finalCookies = await scraper.getCookies();
      if (finalCookies && finalCookies.length > 0) {
        console.log(`Saving ${finalCookies.length} cookies after successful tweet`);
        await saveCookies(username, finalCookies);
      }
      
      return sendTweetResults;
    } catch (error) {
      console.error("Tweet error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
        // Log internal error details if available
        internal: error.internal || {},
        // Log raw error response if available
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        } : null,
        // Log any additional error properties
        ...error
      });
      throw error;
    }

  } catch (error) {
    console.error("Tweet error:", error);
    throw error;
  }
}
