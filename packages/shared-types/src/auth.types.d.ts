export interface AuthCredentials {
    appKey: string;
    clientId: string;
    appSecret: string;
}
export interface AuthHeaders {
    'X-App-Key': string;
    'X-Client-Id': string;
    'X-Timestamp': number;
    'X-Signature': string;
}
