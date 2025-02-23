import { Scraper } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveCookies(username, cookies) {
  try {
    const cookiesString = JSON.stringify(cookies);
    console.log(`Saving ${cookies.length} cookies for ${username}`);
    
    // Upsert cookies into Supabase
    const { error } = await supabase
      .from('twitter_cookies')
      .upsert({ 
        username,
        cookies: cookiesString,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'username'
      });

    if (error) throw error;
    console.log(`Successfully saved cookies for ${username}`);
  } catch (error) {
    console.error('Error saving cookies:', error);
    throw error;
  }
}

async function loadCookies(username) {
  try {
    console.log(`Loading cookies for ${username}`);
    // Get cookies from Supabase
    const { data, error } = await supabase
      .from('twitter_cookies')
      .select('cookies')
      .eq('username', username)
      .single();

    if (error) {
      console.log("No cookies found for user:", username);
      return [];
    }

    if (!data?.cookies) {
      return [];
    }

    const cookiesArray = JSON.parse(data.cookies);
    console.log(`Loaded ${cookiesArray.length} cookies for ${username}`);
    
    return cookiesArray.map(cookieData => {
      const cookie = Cookie.fromJSON(cookieData);
      if (!cookie) {
        console.warn('Failed to parse cookie:', cookieData);
      }
      return cookie;
    }).filter(Boolean);
  } catch (error) {
    console.log("Error loading cookies:", error.message);
    return [];
  }
}

export async function sendTweet(username, password, tweetText, replyToId = null) {
  try {
    console.log(`Initializing tweet process for ${username}`);
    const scraper = new Scraper();
    
    // 1. Try to load and use existing cookies
    let isAuthenticated = false;
    const cookies = await loadCookies(username);
    
    if (cookies.length > 0) {
      console.log(`Setting ${cookies.length} cookies`);
      await scraper.setCookies(cookies);
      isAuthenticated = await scraper.isLoggedIn();
      console.log("Cookie authentication status:", isAuthenticated);
    }

    // 2. If cookies don't work, do fresh login
    if (!isAuthenticated) {
      console.log("Performing fresh login...");
      try {
        await scraper.login(username, password);
        isAuthenticated = await scraper.isLoggedIn();
        console.log("Login status:", isAuthenticated);

        if (isAuthenticated) {
          const newCookies = await scraper.getCookies();
          console.log(`Got ${newCookies.length} new cookies after login`);
          await saveCookies(username, newCookies);
        } else {
          throw new Error("Login failed - authentication unsuccessful");
        }
      } catch (loginError) {
        console.error("Login error:", loginError);
        throw loginError;
      }
    }

    // 3. Quick verification of authentication
    const me = await scraper.me();
    if (!me) {
      throw new Error("Failed to verify user account");
    }
    console.log("Successfully verified access as:", me.screen_name);
    
    // Update cookies after verification
    const updatedCookies = await scraper.getCookies();
    await saveCookies(username, updatedCookies);

    // 4. Send the tweet
    console.log("Sending tweet:", tweetText);
    const sendTweetResults = await scraper.sendTweet(tweetText, replyToId);
    console.log("Send tweet results:", sendTweetResults);
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
