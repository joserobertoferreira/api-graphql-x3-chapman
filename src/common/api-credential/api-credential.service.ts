import { Injectable } from '@nestjs/common';
import { ApiCredential } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ApiCredentialService {
  constructor(private readonly prisma: PrismaService) {}

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
}
