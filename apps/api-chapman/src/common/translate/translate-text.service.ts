import { Injectable } from '@nestjs/common';
import { Prisma, TextToTranslate } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TranslateTextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new translation entry in the database.
   * @param payload - The payload containing translation details.
   * @returns The created translation entry.
   */
  async createTranslation(payload: Prisma.TextToTranslateUncheckedCreateInput): Promise<TextToTranslate> {
    return this.prisma.textToTranslate.create({ data: payload });
  }
}
