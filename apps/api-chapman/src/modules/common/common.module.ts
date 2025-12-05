import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonResolver } from './common.resolver';
import { CommonService } from './common.service';

@Module({
  imports: [PrismaModule],
  providers: [CommonService, CommonResolver],
  exports: [CommonService],
})
export class CommonModule {}
