import { Module } from '@nestjs/common';
import { ParametersModule } from '../parameters/parameter.module';
import { ParametersService } from '../parameters/parameter.service';
import { CryptoService } from './crypto.service';

export const CRYPTO_SERVICE = 'CRYPTO_SERVICE';

@Module({
  imports: [ParametersModule],
  providers: [
    {
      provide: CRYPTO_SERVICE,
      // `inject` diz à fábrica quais serviços ela precisa
      inject: [ParametersService],
      // `useFactory` é a função que constrói o serviço
      useFactory: async (parameterService: ParametersService): Promise<CryptoService> => {
        // 1. Busca a chave mestra do banco de dados de forma assíncrona
        const masterKey = await parameterService.getParameterValue('', '', 'CRYPTSECRE');

        // 2. Cria e retorna a instância do CryptoService com a chave
        return new CryptoService(masterKey?.value ?? '');
      },
    },
  ],
  exports: [
    CRYPTO_SERVICE, // Exportamos o serviço usando o mesmo token
  ],
})
export class CryptoModule {}
