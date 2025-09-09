import { Injectable } from '@nestjs/common';
import { Accounts } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if an account exists in the database.
   * @param chart - The chart of accounts identifier.
   * @param account - The account identifier to check.
   * @returns The account record if found, otherwise null.
   */
  async getAccount(chart: string, account: string): Promise<Accounts | null> {
    const accountRecord = await this.prisma.accounts.findUnique({
      where: { planCode_account: { planCode: chart, account: account } },
    });
    return accountRecord;
  }

  /**
   * Check if multiple accounts exist in the database.
   * @param chart - The chart of accounts identifier.
   * @param accountCodes - An array of account identifiers to check.
   * @returns An array of account records that were found.
   */
  async getAccounts(chart: string, accountCodes: string[]): Promise<Accounts[]> {
    const accounts = await this.prisma.accounts.findMany({
      where: {
        planCode: chart,
        account: { in: accountCodes },
      },
    });
    return accounts;
  }
}
