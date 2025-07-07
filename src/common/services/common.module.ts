import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonService } from './common.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
