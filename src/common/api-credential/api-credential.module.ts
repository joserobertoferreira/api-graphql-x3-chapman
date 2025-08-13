import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { AdminGuard } from '../guards/admin.guard';
import { ApiCredentialResolver } from './api-credential.resolver';
import { ApiCredentialService } from './api-credential.service';

@Module({
  imports: [PrismaModule, CryptoModule],
  providers: [ApiCredentialService, ApiCredentialResolver, AdminGuard],
  exports: [ApiCredentialService],
})
export class ApiCredentialModule {}
