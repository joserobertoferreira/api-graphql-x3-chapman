import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GqlHttpExceptionFilter } from './common/pipes/gql-exception.pipe';
import { LoggingValidationPipe } from './common/pipes/logging-validation.pipe';
import { HmacAuthGuard } from './modules/auth/guards/hmac-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const hmacAuthGuard = app.get(HmacAuthGuard);

  const port = configService.get<number>('SERVER_PORT') || 3000;

  app.useGlobalGuards(hmacAuthGuard);
  app.useGlobalFilters(new GqlHttpExceptionFilter());
  app.useGlobalPipes(new LoggingValidationPipe());
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}
bootstrap();
