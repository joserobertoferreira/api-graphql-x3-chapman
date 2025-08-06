import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GqlHttpExceptionFilter } from './common/pipes/gql-exception.pipe';
import { LoggingValidationPipe } from './common/pipes/logging-validation.pipe';
import { HmacAuthGuard } from './modules/auth/guards/hmac-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const hmacAuthGuard = app.get(HmacAuthGuard);

  app.useGlobalGuards(hmacAuthGuard);
  app.useGlobalFilters(new GqlHttpExceptionFilter());
  app.useGlobalPipes(new LoggingValidationPipe());
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
