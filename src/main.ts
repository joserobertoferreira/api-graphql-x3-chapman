import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GqlHttpExceptionFilter } from './common/pipes/gql-exception.pipe';
import { LoggingValidationPipe } from './common/pipes/logging-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new GqlHttpExceptionFilter());
  app.useGlobalPipes(new LoggingValidationPipe());
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
