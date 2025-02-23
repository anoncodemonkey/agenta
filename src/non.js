import { Scraper } from 'agent-twitter-client';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COOKIES_DIR = path.join(__dirname, '..', 'cookies');

/**
 * Store user cookies in a JSON file
 * @param {string} username - Twitter username
 * @param {Array} cookies - Array of cookie objects
 * @returns {Promise<void>}
 */
export async function saveCookies(username, cookies) {
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

/**
 * Load user cookies from JSON file
 * @param {string} username - Twitter username
 * @returns {Promise<Array>} Array of cookie objects
 */
export async function loadCookies(username) {
  try {
    console.log(`Loading cookies for ${username}`);
    const filePath = path.join(COOKIES_DIR, `${username}.json`);
    
    try {
      const cookiesString = await fs.readFile(filePath, 'utf8');
      const cookies = JSON.parse(cookiesString);
      console.log(`Loaded ${cookies.length} cookies for ${username}`);
      return cookies;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`No saved cookies found for ${username}`);
        return [];
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading cookies:', error);
    throw error;
  }
}

/**
 * Login to Twitter and store cookies
 * @param {string} username - Twitter username
 * @param {string} password - Twitter password
 * @param {string} email - Twitter account email
 * @returns {Promise<void>}
 */
export async function loginAndStoreCookies(username, password, email) {
  try {
    console.log(`[${new Date().toISOString()}] Initializing login process for ${username}`);
    const scraper = new Scraper({
      debug: true,
      timeout: 60000,
      retries: 3
    });
    
    // Perform login
    console.log("Attempting login with credentials...");
    try {
      await scraper.login(username, password);
      console.log("Login request completed");
    } catch (loginError) {
      console.error("Error during login:", loginError);
      throw loginError;
    }

    await scraper.clearCookies();
    
    // Wait a bit for login to complete
    console.log("Waiting for login to settle...");
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Save new cookies
    const newCookies = await scraper.getCookies();
    if (newCookies && newCookies.length > 0) {
      console.log(`Got ${newCookies.length} new cookies after login, saving them...`);
      await saveCookies(username, newCookies);
    } else {
      console.log("Warning: No cookies received after login");
    }

    return newCookies;
  } catch (error) {
    console.error('Error during login process:', error);
    throw error;
  }
}

// Execute the function only if running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const username = 'playgirl80085';
  const password = '<3Saufia';
  const email = 'grey@spank.exchange';

  loginAndStoreCookies(username, password, email).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}


    // // 2. If no cookies or invalid, do fresh login
    // console.log("Checking for valid cookies...");
    // if (!isAuthenticated) {
    //   console.log("Starting fresh login process...");
    //   try {
    //     // Clear any existing cookies
    //     console.log("Clearing existing cookies...");
    //     await scraper.clearCookies();
        
    //     // Perform login
    //     console.log("Attempting login with credentials...");
    //     try {
    //       await scraper.login(username, password, email);
    //       console.log("Login request completed");
    //     } catch (loginError) {
    //       console.error("Error during login:", loginError);
    //       throw loginError;
    //     }
        
    //     // Wait a bit for login to complete
    //     console.log("Waiting for login to settle...");
    //     await new Promise(resolve => setTimeout(resolve, 3000));
    //     isAuthenticated = true;

    //     // Save new cookies
    //     const newCookies = await scraper.getCookies();
    //     if (newCookies && newCookies.length > 0) {
    //       console.log(`Got ${newCookies.length} new cookies after login, saving them...`);
    //       await saveCookies(username, newCookies);
    //     } else {
    //       console.log("Warning: No cookies received after login");
    //     }
    //   } catch (loginError) {
    //     console.error("Login process failed:", loginError);
    //     throw loginError;
    //   }
    // }

    // if (!isAuthenticated) {
    //   throw new Error("Failed to authenticate - no valid cookies and login failed");
    // }