import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Cookie } from 'tough-cookie';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COOKIES_DIR = path.join(__dirname, '..', '..', 'cookies');

/**
 * Save user cookies to a JSON file
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
      const cookiesData = JSON.parse(cookiesString);
      
      // Convert each cookie to a Cookie object
      const cookies = cookiesData.map(cookieData => {
        try {
          // Handle both key/value and name/value formats
          const normalizedData = {
            ...cookieData,
            name: cookieData.key || cookieData.name,
            value: cookieData.value
          };
          const cookie = Cookie.fromJSON(normalizedData);
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