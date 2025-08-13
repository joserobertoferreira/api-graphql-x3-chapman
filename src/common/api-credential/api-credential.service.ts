import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { ApiCredential } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CRYPTO_SERVICE } from '../crypto/crypto.module';
import { CryptoService } from '../crypto/crypto.service';
import { generateUUIDBuffer, getAuditTimestamps } from '../utils/audit-date.utils';
import { CreateApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Injectable()
export class ApiCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CRYPTO_SERVICE) private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Busca uma credencial de API ativa pela sua App Key e Client ID.
   * @returns O objeto da credencial ou null se não for encontrado ou estiver inativo.
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
   * Cria um novo conjunto de credenciais de API.
   * @returns O `appKey` e o `appSecret` bruto, que devem ser exibidos apenas uma vez.
   */
  async create(input: CreateApiCredentialInput): Promise<ApiCredentialEntity> {
    const { clientId, description } = input;

    // 1. Verifica se o Client ID já existe para evitar duplicatas
    const existing = await this.prisma.apiCredential.findUnique({
      where: { clientID: clientId },
    });
    if (existing) {
      throw new ConflictException(`An API credential with Client ID "${clientId}" already exists.`);
    }

    // 2. Gera as chaves aleatórias
    const appKey = crypto.randomBytes(20).toString('hex'); // Gera 40 caracteres hex
    const appSecretRaw = crypto.randomBytes(32).toString('hex'); // Gera 64 caracteres hex

    // 3. Criptografa o segredo para armazenamento
    const appSecretEncrypted = this.cryptoService.encrypt(appSecretRaw);

    // 4. Salva as credenciais no banco de dados
    const timestamps = getAuditTimestamps();
    const headerUUID = generateUUIDBuffer();

    await this.prisma.apiCredential.create({
      data: {
        clientID: clientId,
        description: description,
        appKey: appKey,
        appSecret: appSecretEncrypted, // Salva a versão criptografada
        isActive: 2,
        createDatetime: timestamps.dateTime,
        updateDatetime: timestamps.dateTime,
        singleID: headerUUID,
      },
    });

    // 5. Retorna as chaves geradas, incluindo o segredo BRUTO
    return {
      clientId,
      appKey,
      appSecret: appSecretRaw,
    };
  }
}
