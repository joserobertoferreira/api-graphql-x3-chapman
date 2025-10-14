import { Module } from '@nestjs/common';
import { ApiCredentialModule } from '../../common/api-credential/api-credential.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuthService } from './auth.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';

@Module({
  imports: [ApiCredentialModule, CryptoModule],
  providers: [AuthService, HmacAuthGuard],
  exports: [AuthService, HmacAuthGuard],
})
export class AuthModule {}
