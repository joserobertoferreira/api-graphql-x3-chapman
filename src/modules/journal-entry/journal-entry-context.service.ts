import { Injectable } from '@nestjs/common';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryInput } from './dto/journal-entry.input';

@Injectable()
export class JournalEntryContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly currencyService: CurrencyService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Build a context for journal entry processing.
   */
  async buildContext(input: CreateJournalEntryInput) {}
}
