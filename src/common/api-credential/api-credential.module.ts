import { forwardRef, Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { ParametersModule } from '../parameters/parameter.module';
import { ApiCredentialResolver } from './api-credential.resolver';
import { ApiCredentialService } from './api-credential.service';

@Module({
  imports: [forwardRef(() => CryptoModule), forwardRef(() => ParametersModule)],
  providers: [ApiCredentialService, ApiCredentialResolver],
  exports: [ApiCredentialService],
})
export class ApiCredentialModule {}
