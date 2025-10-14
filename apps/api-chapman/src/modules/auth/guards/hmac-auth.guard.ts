import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';

@Injectable()
export class HmacAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
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
    const request = ctx.getContext().req;

    // 1. Extrai os headers
    const appKey = request.headers['x-app-key'];
    const clientId = request.headers['x-client-id'];
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-signature'];

    // 2. Verifica se todos os headers necessários estão presentes
    if (!appKey || !clientId || !timestamp || !signature) {
      throw new UnauthorizedException('Missing authentication headers.');
    }

    // 3. Delega a validação complexa para o AuthService
    try {
      // Se `validateHmacSignature` for bem-sucedido, ele retorna `true`.
      // Se falhar, ele lança uma `UnauthorizedException`, que o NestJS captura.
      return await this.authService.validateHmacSignature(appKey, clientId, timestamp, signature);
    } catch (error) {
      // Relança qualquer erro do serviço para que o NestJS o trate.
      throw new UnauthorizedException(error.message);
    }
  }
}
