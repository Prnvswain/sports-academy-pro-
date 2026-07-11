import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID } from '../config/app.config.js';
import logger from './logger.js';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and return user information
 * @param {string} idToken - The Google ID token from the frontend
 * @returns {Promise<Object>} - User information from Google
 */
export const verifyGoogleToken = async (idToken) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      const error = new Error('Google Client ID is not configured');
      error.statusCode = 500;
      throw error;
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      const error = new Error('Invalid Google token payload');
      error.statusCode = 401;
      throw error;
    }

    // Extract relevant user information
    const userInfo = {
      google_id: payload.sub,
      email: payload.email,
      name: payload.name,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
      email_verified: payload.email_verified,
    };

    logger.info('Google token verified successfully', {
      google_id: userInfo.google_id,
      email: userInfo.email,
    });

    return userInfo;
  } catch (error) {
    logger.error('Google token verification failed', {
      error: error.message,
      stack: error.stack,
    });

    if (error.message.includes('Token used too late') || error.message.includes('Token used too early')) {
      const tokenError = new Error('Google token has expired');
      tokenError.statusCode = 401;
      throw tokenError;
    }

    if (error.message.includes('Invalid token')) {
      const tokenError = new Error('Invalid Google token');
      tokenError.statusCode = 401;
      throw tokenError;
    }

    throw error;
  }
};
