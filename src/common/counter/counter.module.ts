import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CounterService } from './counter.service';

@Module({
  imports: [PrismaModule],
  providers: [CounterService],
  exports: [CounterService],
})
export class CounterModule {}
