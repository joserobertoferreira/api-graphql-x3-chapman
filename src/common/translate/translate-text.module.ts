import { Module } from '@nestjs/common';
import { TranslateTextService } from './translate-text.service';

@Module({
  providers: [TranslateTextService],
  exports: [TranslateTextService],
})
export class TranslateTextModule {}
