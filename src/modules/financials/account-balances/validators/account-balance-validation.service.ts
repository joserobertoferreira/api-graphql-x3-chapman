import { BadRequestException, Injectable } from '@nestjs/common';
import { createDateRangeFromYear } from 'src/common/utils/date.utils';
import { Prisma } from 'src/generated/prisma/browser';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountBalanceFilter } from '../dto/filter-account-balance.input';

@Injectable()
export class AccountBalanceValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate if the entire AccountBalanceFilter object is valid.
   * @param input - The AccountBalanceFilter to be validated.
   * @returns Promise<void>
   * @throws HttpException if validation fails.
   */
  async validate(input: AccountBalanceFilter): Promise<number> {
    const { site_equals, ledger_equals, fiscalYear_equals, account_equals, fixture_equals } = input;

    let company: string | null = null;

    if (site_equals) {
      const siteExists = await this.prisma.site.findUnique({
        where: { siteCode: site_equals },
        select: { company: true },
      });
      if (!siteExists) {
        throw new BadRequestException('Invalid site code.');
      }

      company = siteExists.company.company;
    }

    let planCode: string | null = null;

    if (ledger_equals) {
      const ledgerExists = await this.prisma.ledger.findUnique({
        where: { code: ledger_equals },
        select: { planCode: true },
      });
      if (!ledgerExists) {
        throw new BadRequestException('Invalid ledger code.');
      }

      planCode = ledgerExists.planCode;
    }

    let fiscalYear: number | null = null;

    if (fiscalYear_equals) {
      if (company === null || !company) {
        throw new BadRequestException('Company information is missing for the given site or site is not provided.');
      }

      const { startDate, endDate } = createDateRangeFromYear({
        year: fiscalYear_equals,
        initialMonth: 1,
        finalMonth: 12,
      });

      const fiscalYearResult = await this.prisma.fiscalYear.findFirst({
        where: {
          company: company,
          ledgerTypeNumber: 1,
          startDate: { gte: startDate },
          endDate: { lte: endDate },
        },
        select: { code: true },
      });

      if (!fiscalYearResult) {
        throw new BadRequestException('Invalid fiscal year for the given company.');
      }

      fiscalYear = fiscalYearResult.code;
    }

    if (fiscalYear === null) fiscalYear = 0;

    if (account_equals) {
      const where: Prisma.AccountsWhereInput = { account: account_equals };

      if (planCode) {
        where.planCode = planCode;
      }

      const accountExists = await this.prisma.accounts.findFirst({
        where: where,
      });
      if (!accountExists) {
        throw new BadRequestException('Invalid account code.');
      }
    }

    if (fixture_equals) {
      const fixtureExists = await this.prisma.dimensions.findFirst({
        where: { dimensionType: 'FIX', dimension: fixture_equals },
      });
      if (!fixtureExists) {
        throw new BadRequestException('Invalid fixture code.');
      }
    }

    return fiscalYear;
  }
}
