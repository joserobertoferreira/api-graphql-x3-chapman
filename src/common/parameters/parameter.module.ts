import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ParametersService } from './parameter.service';

@Module({
  imports: [PrismaModule],
  providers: [ParametersService],
  exports: [ParametersService],
})
export class ParametersModule {}
