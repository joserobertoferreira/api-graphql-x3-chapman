import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TranslateTextService } from './translate-text.service';

@Module({
  imports: [PrismaModule],
  providers: [TranslateTextService],
  exports: [TranslateTextService],
})
export class TranslateTextModule {}
