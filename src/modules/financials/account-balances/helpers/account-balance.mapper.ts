import { LedgerTypeToLedgerTypeGQL } from 'src/common/utils/enums/convert-enum';
import { AnalyticalBalance, Prisma } from 'src/generated/prisma/client';
import { AccountBalanceAmountsEntity, AccountBalanceEntity } from '../entities/account-balance.entity';

/**
 * Groups an array of flat AnalyticalBalance records into an array of nested AccountBalanceEntity.
 *
 * @param balanceRecords - An array of records from the database.
 * @returns An array of grouped AccountBalanceEntity.
 */
export function mapToEntity(balanceRecords: AnalyticalBalance[]): AccountBalanceEntity[] {
  const headerGroupMap = new Map<string, AccountBalanceEntity>();

  for (const record of balanceRecords) {
    // Create a unique key for each group based on grouping fields
    const headerKey = [
      // record.company,
      record.site,
      record.fiscalYear,
      record.ledger,
      record.account,
      record.businessPartner,
      record.dimension1,
    ].join('|');

    // If this is the first time we see this group, create the "header" object
    if (!headerGroupMap.has(headerKey)) {
      headerGroupMap.set(headerKey, {
        site: record.site,
        fiscalYear: record.fiscalYear,
        ledgerTypeNumber: LedgerTypeToLedgerTypeGQL[record.ledgerTypeNumber],
        ledger: record.ledger,
        ledgerCurrency: record.ledgerCurrency,
        account: record.account,
        businessPartner: record.businessPartner,
        fixture: record.dimension1,
        dimensions: [],
      });
    }

    const currentHeader = headerGroupMap.get(headerKey)!;

    // Try to find an existing dimension object within the current header
    let dimensionSubHeader = currentHeader.dimensions!.find(
      (dim) =>
        dim.broker === record.dimension2 &&
        dim.department === record.dimension3 &&
        dim.location === record.dimension4 &&
        dim.type === record.dimension5 &&
        dim.product === record.dimension6 &&
        dim.analysis === record.dimension7,
    );

    // If not found, create a new dimension object and add it to the current header
    if (!dimensionSubHeader) {
      dimensionSubHeader = {
        broker: record.dimension2,
        department: record.dimension3,
        location: record.dimension4,
        type: record.dimension5,
        product: record.dimension6,
        analysis: record.dimension7,
        amounts: [],
      };
      currentHeader.dimensions!.push(dimensionSubHeader);
    }

    // Add the amount record to the dimension's amounts array
    for (let i = 1; i <= 28; i++) {
      const debitLedgerKey = `debitAmountInLedgerCurrency${i}` as keyof typeof record;
      const creditLedgerKey = `creditAmountInLedgerCurrency${i}` as keyof typeof record;
      const debitCurrencyKey = `debitAmountInCurrency${i}` as keyof typeof record;
      const creditCurrencyKey = `creditAmountInCurrency${i}` as keyof typeof record;

      const debitLedgerValue = (record[debitLedgerKey] as Prisma.Decimal | null) ?? new Prisma.Decimal(0);
      const creditLedgerValue = (record[creditLedgerKey] as Prisma.Decimal | null) ?? new Prisma.Decimal(0);
      const debitCurrencyValue = (record[debitCurrencyKey] as Prisma.Decimal | null) ?? new Prisma.Decimal(0);
      const creditCurrencyValue = (record[creditCurrencyKey] as Prisma.Decimal | null) ?? new Prisma.Decimal(0);

      const amountDetail: AccountBalanceAmountsEntity = {
        debitAmountInLedgerCurrency: debitLedgerValue.toNumber(),
        creditAmountInLedgerCurrency: creditLedgerValue.toNumber(),
        currency: record.currency,
        debitAmountInCurrency: debitCurrencyValue.toNumber(),
        creditAmountInCurrency: creditCurrencyValue.toNumber(),
      };

      // add to amounts array
      dimensionSubHeader.amounts!.push(amountDetail);
    }
  }

  // Return an array with all the unique "header" objects that were created
  return Array.from(headerGroupMap.values());
}
