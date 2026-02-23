import { Module } from '@nestjs/common';
import { DocumentTextService } from './common-text.service';
import { CommonResolver } from './common.resolver';
import { CommonService } from './common.service';

@Module({
  providers: [CommonService, CommonResolver, DocumentTextService],
  exports: [CommonService, DocumentTextService],
})
export class CommonModule {}
