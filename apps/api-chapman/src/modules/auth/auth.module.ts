import { Global, Module } from '@nestjs/common';
import { ApiCredentialModule } from '../../common/api-credential/api-credential.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AuthService } from './auth.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';

@Global()
@Module({
  imports: [ApiCredentialModule, CryptoModule],
  providers: [AuthService, HmacAuthGuard, AdminGuard],
  exports: [AuthService, HmacAuthGuard, AdminGuard],
})
export class AuthModule {}
