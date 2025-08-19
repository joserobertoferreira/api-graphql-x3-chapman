import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { CRYPTO_SERVICE } from 'src/common/crypto/crypto.module';
import { CryptoService } from 'src/common/crypto/crypto.service';
import { ApiCredentialService } from '../../common/api-credential/api-credential.service';

@Injectable()
export class AuthService {
  constructor(
    // Ele precisa do "arquivista" para buscar as credenciais
    private readonly apiCredentialService: ApiCredentialService,
    private readonly configService: ConfigService,
    @Inject(CRYPTO_SERVICE) private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Valida uma assinatura HMAC de uma requisição.
   * @param appKey - A App Key recebida no header.
   * @param clientId - O Client ID recebido no header.
   * @param timestamp - O timestamp recebido no header (como string).
   * @param signatureFromRequest - A assinatura recebida no header.
   * @returns `true` se a assinatura for válida.
   * @throws UnauthorizedException se a validação falhar em qualquer etapa.
   */
  async validateHmacSignature(
    appKey: string,
    clientId: string,
    timestamp: string,
    signatureFromRequest: string,
  ): Promise<boolean> {
    // 1. Validação do Timestamp
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTTL = parseInt(this.configService.get<string>('AUTH_SIGNATURE_TTL_SECONDS', '300'), 10);

    if (isNaN(requestTime) || currentTime - requestTime > signatureTTL) {
      throw new UnauthorizedException('Request timestamp is invalid or has expired.');
    }

    // 2. Buscar a Credencial (delegação para o "arquivista")
    const credential = await this.apiCredentialService.findActiveCredential(appKey, clientId);
    if (!credential) {
      throw new UnauthorizedException('Invalid App Key or Client ID.');
    }

    // 3. Descriptografar o Segredo
    const appSecretRaw = this.cryptoService.decrypt(credential.appSecret);

    // 4. Recriar a Assinatura
    const message = `${appKey}${clientId}${timestamp}`;

    const expectedSignature = crypto
      .createHmac('sha256', appSecretRaw) // Usa o segredo bruto que acabamos de descriptografar
      .update(message)
      .digest('hex');

    // 5. Comparar as Assinaturas de Forma Segura
    try {
      const areSignaturesEqual = crypto.timingSafeEqual(
        Buffer.from(signatureFromRequest, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );

      if (!areSignaturesEqual) {
        throw new Error('Signatures do not match.');
      }
    } catch {
      throw new UnauthorizedException('Invalid signature.');
    }

    return true;
  }
}
