import { Scraper } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COOKIES_DIR = path.join(__dirname, '..', 'cookies');

async function saveCookies(username, cookies) {
  try {
    if (!cookies || cookies.length === 0) {
      console.log('No cookies to save');
      return;
    }

    // Filter out guest cookies
    const validCookies = cookies.filter(cookie => {
      const name = cookie.key || cookie.name;
      return !name.startsWith('guest_') && name !== 'personalization_id';
    });

    if (validCookies.length === 0) {
      console.log('No valid session cookies to save');
      return;
    }

    console.log(`Saving ${validCookies.length} cookies for ${username}`);
    const cookiesString = JSON.stringify(validCookies, null, 2);
    
    // Ensure directory exists
    await fs.mkdir(COOKIES_DIR, { recursive: true });
    
    // Save cookies to file
    const filePath = path.join(COOKIES_DIR, `${username}.json`);
    await fs.writeFile(filePath, cookiesString, 'utf8');
    console.log(`Successfully saved cookies to ${filePath}`);
  } catch (error) {
    console.error('Error saving cookies:', error);
    throw error;
  }
}

async function loadCookies(username) {
  try {
    console.log(`Loading cookies for ${username}`);
    const filePath = path.join(COOKIES_DIR, `${username}.json`);
    
    try {
      const cookiesString = await fs.readFile(filePath, 'utf8');
      const cookiesArray = JSON.parse(cookiesString);
      console.log(`Loaded ${cookiesArray.length} cookies for ${username}`);
      
      return cookiesArray.map(cookieData => {
        try {
          const cookie = Cookie.fromJSON(cookieData);
          if (!cookie) {
            console.warn('Failed to parse cookie:', cookieData);
            return null;
          }
          return cookie;
        } catch (err) {
          console.warn('Error parsing cookie:', err.message);
          return null;
        }
      }).filter(Boolean);
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log(`No cookie file found for ${username}`);
        return [];
      }
      throw err;
    }
  } catch (error) {
    console.log("Error loading cookies:", error.message);
    return [];
  }
}

export async function sendTweet(username, password, email, tweetText, replyToId = null) {
  try {
    console.log(`[${new Date().toISOString()}] Initializing tweet process for ${username}`);
    const scraper = new Scraper({
      debug: true,
      timeout: 60000,
      retries: 3,
      flowOptions: {
        autoAcceptTerms: true,
        autoHandlePhone: true,
        autoHandleEmail: true
      }
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
    
    // 4. Save any updated cookies
    // const finalCookies = await scraper.getCookies();
    // if (finalCookies && finalCookies.length > 0) {
    //   console.log(`Saving ${finalCookies.length} cookies after successful tweet`);
    //   await saveCookies(username, finalCookies);
    // }
    
    // return sendTweetResults;

  } catch (error) {
    console.error("Tweet error:", error);
    throw error;
  }
}

// Execute the function only if running directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [username, password, text] = process.argv.slice(2);
  if (!username || !password || !text) {
    console.error('Usage: node tweet.js <username> <password> <text>');
    process.exit(1);
  }
  sendTweet(username, password, text).catch(console.error);
}
