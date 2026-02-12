import { SystemUsedGQL } from '../registers/enum-register';
import { LocalMenus } from '../utils/enums/local-menu';

/**
 * Defines the structure of the credentials required to generate the signature.
 */
export interface AuthCredentials {
  appKey: string;
  clientId: string;
  appSecret: string;
  system: SystemUsedGQL;
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

// Constants

export const localMenuSystemUsedToGqlEnum: Record<LocalMenus.SystemUsed, SystemUsedGQL> = {
  [LocalMenus.SystemUsed.SAGE]: SystemUsedGQL.sage,
  [LocalMenus.SystemUsed.MAGMA]: SystemUsedGQL.magma,
  [LocalMenus.SystemUsed.PIONEER]: SystemUsedGQL.pioneer,
};
