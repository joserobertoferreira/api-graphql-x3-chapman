/**
 * Defines the structure of the credentials required to generate the signature.
 */
export interface AuthCredentials {
  appKey: string;
  clientId: string;
  appSecret: string;
}

/**
 * Defines the structure of the headers returned.
 */
export interface AuthHeaders {
  'X-App-Key': string;
  'X-Client-Id': string;
  'X-Timestamp': number;
  'X-Signature': string;
}
