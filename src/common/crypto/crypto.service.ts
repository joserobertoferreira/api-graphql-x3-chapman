import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;

  constructor(masterKey: string) {
    if (!masterKey || masterKey.length !== 32) {
      throw new InternalServerErrorException('Encryption master key is not valid (must be 32 characters).');
    }
    this.key = Buffer.from(masterKey, 'utf-8');
  }

  /**
   * Criptografa um texto plano (como o app secret).
   * @param text - O texto a ser criptografado.
   * @returns Uma string no formato iv:authTag:encryptedData, codificada em hex.
   */
  encrypt(text: string): string {
    // IV (Initialization Vector) deve ser único para cada criptografia
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // O Auth Tag é crucial para a segurança do GCM
    const authTag = cipher.getAuthTag();

    // Juntamos tudo em uma única string para armazenamento
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Descriptografa um texto que foi criptografado com o método encrypt.
   * @param encryptedText - A string criptografada no formato iv:authTag:encryptedData.
   * @returns O texto plano original.
   */
  decrypt(encryptedText: string): string {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted text format.');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new InternalServerErrorException('Failed to decrypt secret.');
    }
  }
}
