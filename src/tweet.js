import { Scraper } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';
import fs from 'fs/promises';
import path from 'path';

const COOKIES_DIR = '/root/agenta/cookies';

async function saveCookies(username, cookies) {
  try {
    console.log(`Saving ${cookies.length} cookies for ${username}`);
    const cookiesString = JSON.stringify(cookies, null, 2);
    
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

export async function sendTweet(username, password, tweetText, replyToId = null) {
  try {
    console.log(`[${new Date().toISOString()}] Initializing tweet process for ${username}`);
    const scraper = new Scraper({
      debug: true,
      timeout: 30000,
      retries: 3
    });

    // 1. Try to use existing cookies first
    let isAuthenticated = false;
    const cookies = await loadCookies(username);
    
    if (cookies.length > 0) {
      console.log(`Setting ${cookies.length} cookies`);
      await scraper.setCookies(cookies);
      try {
        isAuthenticated = await scraper.isLoggedIn();
        console.log("Cookie authentication status:", isAuthenticated);
      } catch (error) {
        console.log("Error checking login status:", error.message);
        isAuthenticated = false;
      }
    }

    // 2. If cookies don't work, do fresh login
    if (!isAuthenticated) {
      console.log("Cookies invalid or not found, performing fresh login...");
      try {
        // Clear any existing cookies first
        await scraper.clearCookies();
        
        // Perform login
        await scraper.login(username, password);
        
        // Wait for login to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        isAuthenticated = await scraper.isLoggedIn();
        console.log("Fresh login status:", isAuthenticated);

        if (!isAuthenticated) {
          throw new Error("Login failed - authentication unsuccessful");
        }

        // Save new cookies after successful login
        const newCookies = await scraper.getCookies();
        console.log(`Got ${newCookies.length} new cookies after login`);
        if (newCookies.length > 0) {
          await saveCookies(username, newCookies);
        }
      } catch (loginError) {
        console.error("Login error:", loginError);
        throw loginError;
      }
    }

    // 3. Quick verification of authentication
    console.log("Verifying account access...");
    const me = await scraper.me();
    if (!me) {
      throw new Error("Failed to verify user account");
    }
    console.log("Successfully verified access as:", me.screen_name);
    
    // Save any updated cookies
    const updatedCookies = await scraper.getCookies();
    if (updatedCookies.length > 0) {
      await saveCookies(username, updatedCookies);
    }

    // 4. Send the tweet
    console.log("Preparing to send tweet:", tweetText, replyToId ? `in reply to ${replyToId}` : '');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const sendTweetResults = await scraper.sendTweet(tweetText, replyToId);
    console.log("Send tweet results:", JSON.stringify(sendTweetResults, null, 2));
    
    // Save final cookies after successful tweet
    const finalCookies = await scraper.getCookies();
    if (finalCookies.length > 0) {
      await saveCookies(username, finalCookies);
    }
    
    return sendTweetResults;

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
