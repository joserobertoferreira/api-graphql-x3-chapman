import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CryptoModule } from '../crypto/crypto.module';
import { ParametersModule } from '../parameters/parameter.module';
import { ApiCredentialResolver } from './api-credential.resolver';
import { ApiCredentialService } from './api-credential.service';

@Module({
  imports: [PrismaModule, CryptoModule, ParametersModule],
  providers: [ApiCredentialService, ApiCredentialResolver],
  exports: [ApiCredentialService],
})
export class ApiCredentialModule {}
