import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminKey: string;
  constructor(private readonly configService: ConfigService) {
    const adminKey = this.configService.get<string>('ADMIN_API_KEY');
    if (!adminKey) {
      throw new Error('ADMIN_API_KEY is not defined in environment variables.');
    }
    this.adminKey = adminKey;
  }

  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const keyFromHeader = request.headers['x-admin-key'];

    if (keyFromHeader === this.adminKey) {
      return true;
    }

    throw new UnauthorizedException('Invalid or missing Admin Key.');
  }
}
