import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingValidationPipe } from './common/pipes/logging-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new LoggingValidationPipe(),
    // new ValidationPipe({
    //   transform: true,
    //   whitelist: true,
    //   forbidNonWhitelisted: true,
    //   transformOptions: {
    //     enableImplicitConversion: true,
    //   },
    // }),
  );
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
