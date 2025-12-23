import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiCredential } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CRYPTO_SERVICE } from '../crypto/crypto.module';
import { CryptoService } from '../crypto/crypto.service';
import { ParametersService } from '../parameters/parameter.service';
import { getAuditTimestamps } from '../utils/audit-date.utils';
import { CreateApiCredentialInput, GetApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Injectable()
export class ApiCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    @Inject(CRYPTO_SERVICE) private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Validates user login and password.
   * @returns The full ApiCredential object for the user if validation is successful.
   * @throws UnauthorizedException if the credentials are invalid.
   */
  private async _validateUserCredentials(login: string, password: string): Promise<ApiCredential> {
    // Find the user
    const user = await this.prisma.apiCredential.findUnique({ where: { login } });
    if (!user) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    // Get the encryption parameter
    const cryptoParam = await this.parametersService.getParameterValue('', '', '', 'CRYPTSECRE');
    if (!cryptoParam) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    // Decrypt and compare the password
    const planPassword = this.cryptoService.decryptVigenere(user.password, cryptoParam?.value);
    if (!planPassword) {
      throw new UnauthorizedException('Invalid login or password.');
    }
    if (planPassword !== password) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    // Return the full 'user' object on success
    return user;
  }

  /**
   * Finds an active API credential by its App Key and Client ID.
   * @param appKey - The application key.
   * @param clientId - The client ID.
   * @returns The credential object or null if not found or inactive.
   */
  async findActiveCredential(appKey: string, clientId: string): Promise<ApiCredential | null> {
    return this.prisma.apiCredential.findFirst({
      where: {
        appKey: appKey,
        clientID: clientId,
        isActive: 2,
      },
    });
  }

  /**
   * Validates if the user and password are valid and creates a new set of API credentials.
   * @param input - The input data to create the credentials.
   * @returns The `appKey` and the raw `appSecret`, which should only be displayed once.
   * @throws BadRequestException if credentials already exist for the user.
   * @throws InternalServerErrorException if a unique Client ID cannot be generated.
   */
  async create(input: CreateApiCredentialInput): Promise<ApiCredentialEntity> {
    const { login, password } = input;

    // Validate if the user and password are valid
    const user = await this._validateUserCredentials(login, password);

    // Check if the credentials already exist, if so just return them
    if (user.clientID.trim() !== '') {
      throw new BadRequestException('API credentials already exist for this user.');
    }

    // Generate a unique Client ID
    let clientId: string | null = null;
    const MAX_ATTEMPTS = 5;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const potentialClientId = uuidv4().replace(/-/g, '').toUpperCase();
      const count = await this.prisma.apiCredential.count({
        where: { clientID: potentialClientId },
      });

      if (count === 0) {
        clientId = potentialClientId;
        break;
      }
    }

    if (!clientId) {
      throw new InternalServerErrorException('Failed to generate a unique Client ID after multiple attempts.');
    }

    // Generate random keys
    const appKey = crypto.randomBytes(20).toString('hex'); // Generates 40 hex characters
    const appSecretRaw = crypto.randomBytes(32).toString('hex'); // Generates 64 hex characters

    // Encrypt the secret for storage
    const appSecretEncrypted = this.cryptoService.encrypt(appSecretRaw);

    // Save the credentials in the database
    const timestamps = getAuditTimestamps();

    await this.prisma.apiCredential.update({
      where: { login: user.login },
      data: {
        clientID: clientId,
        appKey: appKey,
        appSecret: appSecretEncrypted, // Save the encrypted version
        updateDatetime: timestamps.dateTime,
      },
    });

    // Return the generated keys, including the raw secret
    return {
      name: user.description,
      clientId,
      appKey,
      appSecret: appSecretRaw,
    };
  }

  /**
   * Validates a login/password pair and returns existing API credentials if valid.
   * @param input - The login and password to be validated.
   * @returns The API credentials (appKey, clientId, raw appSecret) or throws an exception.
   */
  async get(input: GetApiCredentialInput): Promise<ApiCredentialEntity> {
    const { login, password } = input;

    // Validate if the user and password are valid
    const user = await this._validateUserCredentials(login, password);

    // Encrypt the secret for storage
    let appSecretRaw = '';
    if (user.appSecret.trim() !== '') {
      appSecretRaw = this.cryptoService.decrypt(user.appSecret);
    }

    //  Return the credentials in the form of their GraphQL entity
    return {
      name: user.description,
      clientId: user.clientID,
      appKey: user.appKey,
      appSecret: appSecretRaw, // Return the decrypted secret
    };
  }
}
