import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCredential } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { CRYPTO_SERVICE } from '../crypto/crypto.module';
import { CryptoService } from '../crypto/crypto.service';
import { ParametersService } from '../parameters/parameter.service';
import { getAuditTimestamps } from '../utils/audit-date.utils';
import { CreateApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Injectable()
export class ApiCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
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
   * Valida se o utilizador e password são válidos e cria um novo conjunto de credenciais de API.
   * @param input - Os dados de entrada para criar as credenciais.
   * @returns O `appKey` e o `appSecret` bruto, que devem ser exibidos apenas uma vez.
   */
  async create(input: CreateApiCredentialInput): Promise<ApiCredentialEntity> {
    const { login, password } = input;

    // Valida se o utilizador e password são válidos
    const user = await this.prisma.apiCredential.findUnique({ where: { login } });
    if (!user) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    const cryptoParam = await this.parametersService.getParameterValue('', '', 'CRYPTSECRE');
    if (!cryptoParam) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    const planPassword = this.cryptoService.decryptVigenere(user.password, cryptoParam?.value);
    if (!planPassword) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    if (planPassword !== password) {
      throw new UnauthorizedException('Invalid login or password.');
    }

    // Verifica se as credenciais já existem, se sim apenas devolve
    if (user.clientID.trim() !== '') {
      throw new BadRequestException('API credentials already exist for this user.');
    }

    // Gerar um ID Client único
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

    // Gera as chaves aleatórias
    const appKey = crypto.randomBytes(20).toString('hex'); // Gera 40 caracteres hex
    const appSecretRaw = crypto.randomBytes(32).toString('hex'); // Gera 64 caracteres hex

    // Criptografa o segredo para armazenamento
    const appSecretEncrypted = this.cryptoService.encrypt(appSecretRaw);

    // Salva as credenciais no banco de dados
    const timestamps = getAuditTimestamps();

    await this.prisma.apiCredential.update({
      where: { login: user.login },
      data: {
        clientID: clientId,
        appKey: appKey,
        appSecret: appSecretEncrypted, // Salva a versão criptografada
        updateDatetime: timestamps.dateTime,
      },
    });

    // Retorna as chaves geradas, incluindo o segredo BRUTO
    return {
      name: user.description,
      clientId,
      appKey,
      appSecret: appSecretRaw,
    };
  }
}
