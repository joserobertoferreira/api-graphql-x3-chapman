import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestContextService } from '../context/request-context.service';
import { GqlContext } from '../types/graphql-context.types';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminKey: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    const adminKey = this.configService.get<string>('ADMIN_API_KEY');
    if (!adminKey) {
      throw new Error('ADMIN_API_KEY is not defined in environment variables.');
    }
    this.adminKey = adminKey;
  }

  canActivate(context: ExecutionContext): boolean {
    const ctx = GqlExecutionContext.create(context);

    const { req } = ctx.getContext<GqlContext>();

    const adminKeyFromHeader = req.headers['x-admin-key'];

    const excelKey = req.headers['x-excel-key'] || false;

    if (adminKeyFromHeader === this.adminKey) {
      this.requestContext.setData({ isExcel: !!excelKey });
      return true;
    }

    throw new UnauthorizedException('Invalid or missing Admin Key.');
  }
}
