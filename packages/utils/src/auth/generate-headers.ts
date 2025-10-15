import type { AuthCredentials, AuthHeaders } from '@chapman/shared-types';
import { createHmac } from 'crypto';

/**
 * Generates authentication headers for the Chapman API based on the provided credentials.
 * This is a "pure" function: its result depends only on its inputs,
 * making it predictable and easy to test.
 *
 * @param credentials - An object containing appKey, clientId, and appSecret.
 * @returns An object containing the authentication headers ready to be used.
 * @throws {Error} If the provided credentials are invalid or incomplete.
 */
export const generateAuthHeaders = (credentials: AuthCredentials): AuthHeaders => {
  if (!credentials || !credentials.appKey || !credentials.clientId || !credentials.appSecret) {
    throw new Error(
      'Invalid credentials provided. The object must contain appKey, clientId, and appSecret properties.',
    );
  }

  const { appKey, clientId, appSecret } = credentials;

  // Create the timestamp in seconds (UNIX timestamp)
  const timestamp = Math.floor(Date.now() / 1000);

  // Build the message to be signed
  const message = `${appKey}${clientId}${timestamp}`;

  // Generate the HMAC-SHA256 signature
  const signature = createHmac('sha256', appSecret).update(message).digest('hex');

  // Return the headers object, conforming to the AuthHeaders interface
  return {
    'X-App-Key': appKey,
    'X-Client-Id': clientId,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
  };
};
