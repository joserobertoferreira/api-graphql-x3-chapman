import { Module } from '@nestjs/common';
import { ParametersService } from './parameter.service';

@Module({
  providers: [ParametersService],
  exports: [ParametersService],
})
export class ParametersModule {}
