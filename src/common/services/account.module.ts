import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccountService } from './account.service';

@Module({
  imports: [PrismaModule],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
