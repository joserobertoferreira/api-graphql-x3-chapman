import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestContextService } from '../../../common/context/request-context.service';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { GqlContext } from '../../../common/types/graphql-context.types';
import { AuthService } from '../auth.service';

@Injectable()
export class HmacAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Pega o contexto da requisição GraphQL
    const ctx = GqlExecutionContext.create(context);

    const { req } = ctx.getContext<GqlContext>();

    // Extrai os headers
    const appKey = Array.isArray(req.headers['x-app-key']) ? req.headers['x-app-key'][0] : req.headers['x-app-key'];
    const clientId = Array.isArray(req.headers['x-client-id'])
      ? req.headers['x-client-id'][0]
      : req.headers['x-client-id'];
    const timestamp = Array.isArray(req.headers['x-timestamp'])
      ? req.headers['x-timestamp'][0]
      : req.headers['x-timestamp'];
    const signature = Array.isArray(req.headers['x-signature'])
      ? req.headers['x-signature'][0]
      : req.headers['x-signature'];

    const excelKey = req.headers['x-excel-key'] || false;

    // Verifica se todos os headers necessários estão presentes
    if (!appKey || !clientId || !timestamp || !signature) {
      throw new UnauthorizedException('Missing authentication headers.');
    }

    // Delega a validação complexa para o AuthService
    try {
      // Se `validateHmacSignature` for bem-sucedido, ele retorna `true`.
      // Se falhar, ele lança uma `UnauthorizedException`, que o NestJS captura.
      const credential = await this.authService.validateHmacSignature(appKey, clientId, timestamp, signature);

      this.requestContext.setData({ currentUser: credential[1], isExcel: !!excelKey, systemUsed: credential[2] });

      return credential[0];
    } catch (error) {
      // Relança qualquer erro do serviço para que o NestJS o trate.
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      throw new UnauthorizedException(errorMessage);
    }
  }
}
