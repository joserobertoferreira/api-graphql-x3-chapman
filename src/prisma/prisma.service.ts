import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  // O NestJS chamará este método automaticamente ao encerrar a aplicação
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
