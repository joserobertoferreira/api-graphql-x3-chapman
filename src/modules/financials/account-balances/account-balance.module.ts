import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import { AccountBalanceResolver } from './account-balance.resolver';
import { AccountBalanceService } from './account-balance.service';
import { AccountBalanceValidationService } from './validators/account-balance-validation.service';

@Module({
  imports: [PrismaModule, forwardRef(() => CommonModule)],
  providers: [AccountBalanceService, AccountBalanceValidationService, AccountBalanceResolver],
  exports: [AccountBalanceService, AccountBalanceValidationService],
})
export class AccountBalanceModule {}
