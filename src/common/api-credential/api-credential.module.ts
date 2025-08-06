import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApiCredentialService } from './api-credential.service';

@Module({
  imports: [PrismaModule],
  providers: [ApiCredentialService],
  exports: [ApiCredentialService],
})
export class ApiCredentialModule {}
