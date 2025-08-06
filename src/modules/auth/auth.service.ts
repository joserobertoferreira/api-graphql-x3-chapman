import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ApiCredentialService } from '../../common/api-credential/api-credential.service';

@Injectable()
export class AuthService {
  constructor(
    // Ele precisa do "arquivista" para buscar as credenciais
    private readonly apiCredentialService: ApiCredentialService,
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
    const FIVE_MINUTES = 5 * 60;

    if (isNaN(requestTime) || currentTime - requestTime > FIVE_MINUTES) {
      throw new UnauthorizedException('Request timestamp is invalid or has expired.');
    }

    // 2. Buscar a Credencial (delegação para o "arquivista")
    const credential = await this.apiCredentialService.findActiveCredential(appKey, clientId);
    if (!credential) {
      throw new UnauthorizedException('Invalid App Key or Client ID.');
    }

    // 3. Recriar a Assinatura (o trabalho do "especialista")
    const message = `${appKey}${clientId}${timestamp}`;

    // ATENÇÃO: O `appSecretHash` é o HASH do segredo, não o segredo em si.
    // A lógica HMAC precisa do SEGREDO BRUTO. Isso significa que a sua tabela
    // no X3 precisa armazenar o segredo criptografado de forma reversível, ou
    // a validação precisa ser diferente. Por agora, vamos assumir que você
    // tem acesso ao segredo bruto. Se não, precisaremos ajustar a lógica.
    // VOU ASSUMIR QUE `credential.appSecret` existe por enquanto.
    const expectedSignature = crypto
      .createHmac('sha256', credential.appSecret) // Assumindo que você tem o segredo
      .update(message)
      .digest('hex');

    // 4. Comparar as Assinaturas de Forma Segura
    const areSignaturesEqual = crypto.timingSafeEqual(
      Buffer.from(signatureFromRequest, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );

    if (!areSignaturesEqual) {
      throw new UnauthorizedException('Invalid signature.');
    }

    return true;
  }
}
