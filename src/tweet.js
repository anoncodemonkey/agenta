import { Scraper } from 'agent-twitter-client';
import { Cookie } from 'tough-cookie';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = "https://fwcpubehwjbraaytapvl.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3Y3B1YmVod2picmFheXRhcHZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzY0MzU0MiwiZXhwIjoyMDUzMjE5NTQyfQ.bfT6yOBYrjj4bT5-fPzrNS00BQ9IPsUV-S1tNYK2i0s";
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveCookies(username, cookies) {
  try {
    const cookiesString = JSON.stringify(cookies);
    
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
    console.log(`Saved ${cookies.length} cookies for ${username}`);
  } catch (error) {
    console.error('Error saving cookies:', error);
    throw error;
  }
}

async function loadCookies(username) {
  try {
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
    console.log(`Loading ${cookiesArray.length} cookies for ${username}`);
    
    return cookiesArray.reduce((acc, current) => {
      const cookie = Cookie.fromJSON(current);
      if (cookie) {
        acc.push(cookie);
      }
      return acc;
    }, []);
  } catch (error) {
    console.log("Error loading cookies:", error.message);
    return [];
  }
}

export async function sendTweet(username, password, tweetText, replyToId = null) {
  try {
    const scraper = new Scraper();
    
    // 1. Try to load and use existing cookies
    let isAuthenticated = false;
    const cookies = await loadCookies(username);
    if (cookies.length > 0) {
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
          await saveCookies(username, newCookies);
        } else {
          throw new Error("Login failed");
        }
      } catch (loginError) {
        console.error("Login error:", loginError);
        throw loginError;
      }
    }

    // 3. Quick verification of authentication
    const me = await scraper.me();
    if (me) {
      console.log("Successfully verified access");
      const updatedCookies = await scraper.getCookies();
      await saveCookies(username, updatedCookies);
    }

    // 4. Send the tweet
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
