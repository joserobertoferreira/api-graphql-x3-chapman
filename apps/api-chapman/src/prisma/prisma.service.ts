import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      transactionOptions: { maxWait: 10000, timeout: 25000 },
      // log: [
      //   {
      //     emit: 'stdout', // Envia o log para o console (saída padrão)
      //     level: 'query', // Especifica que você quer ver as queries
      //   },
      //   {
      //     emit: 'stdout',
      //     level: 'info',
      //   },
      //   {
      //     emit: 'stdout',
      //     level: 'warn',
      //   },
      //   {
      //     emit: 'stdout',
      //     level: 'error',
      //   },
      // ],
    });
  }

  // O NestJS chamará este método automaticamente ao iniciar a aplicação
  async onModuleInit() {
    await this.$connect();
  }

  // O NestJS chamará este método automaticamente ao encerrar a aplicação
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
