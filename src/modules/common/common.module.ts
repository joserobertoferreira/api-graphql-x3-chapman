import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DocumentTextService } from './common-text.service';
import { CommonResolver } from './common.resolver';
import { CommonService } from './common.service';

@Module({
  imports: [PrismaModule],
  providers: [CommonService, CommonResolver, DocumentTextService],
  exports: [CommonService, DocumentTextService],
})
export class CommonModule {}
