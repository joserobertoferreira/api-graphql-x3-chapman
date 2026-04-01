import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';
import { GqlHttpExceptionFilter } from './common/pipes/gql-exception.pipe';
import { HmacAuthGuard } from './modules/auth/guards/hmac-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const hmacAuthGuard = app.get(HmacAuthGuard);

  const port = configService.get<number>('SERVER_PORT') || 3001;

  app.enableCors({
    origin: ['http://localhost:3000', 'http://cfg-uks-x3-03:8241/graphql'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-App-key',
      'X-Client-Id',
      'X-Timestamp',
      'X-Signature',
      'X-excel-key',
    ],
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalGuards(hmacAuthGuard);
  app.useGlobalFilters(new GqlHttpExceptionFilter());
  // app.useGlobalPipes(new LoggingValidationPipe());clear

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
}
void bootstrap();
