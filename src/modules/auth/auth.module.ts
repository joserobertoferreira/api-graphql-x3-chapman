import { Module } from '@nestjs/common';
import { ApiCredentialModule } from '../../common/api-credential/api-credential.module';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { AuthService } from './auth.service';
import { HmacAuthGuard } from './guards/hmac-auth.guard';

@Module({
  imports: [
    ApiCredentialModule,
    CryptoModule,
    // Se você usar JWT no futuro, ele seria importado aqui:
    // JwtModule.register({ ... })
  ],
  providers: [
    AuthService,
    HmacAuthGuard, // Declara o Guard como um provider
  ],
  exports: [
    AuthService,
    HmacAuthGuard, // Exporta o Guard para que ele possa ser usado globalmente
  ],
})
export class AuthModule {}
