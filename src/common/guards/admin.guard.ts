import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { RequestContextService } from '../context/request-context.service';

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
    const request = ctx.getContext().req;
    const adminKeyFromHeader = request.headers['x-admin-key'];
    const excelKey = request.headers['x-excel-key'] || false;

    if (adminKeyFromHeader === this.adminKey) {
      this.requestContext.setData({ isExcel: excelKey });
      return true;
    }

    throw new UnauthorizedException('Invalid or missing Admin Key.');
  }
}
