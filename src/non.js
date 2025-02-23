import { Scraper } from 'agent-twitter-client';
import { saveCookies } from './shared/cookies.js';

/**
 * Login to Twitter and store cookies
 * @param {string} username - Twitter username
 * @param {string} password - Twitter password
 * @param {string} email - Twitter account email
 * @returns {Promise<void>}
 */
export async function loginAndStoreCookies(username, password) {
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

  loginAndStoreCookies(username, password).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}