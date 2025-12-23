import { DimensionsInput } from 'src/common/inputs/dimension.input';
import { CommonDimensionEntity } from 'src/common/outputs/common-dimension.entity';
import { SignByDefaultGQL } from 'src/common/registers/enum-register';
import {
  AccountingJournalStatusToAccountingJournalStatusGQL,
  ExchangeRateTypeToExchangeRateTypeGQL,
} from 'src/common/utils/enums/convert-enum';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Prisma } from 'src/generated/prisma/client';
import { IntercompanyJournalEntryLineEntity } from '../entities/intercompany-journal-entity-line.entity';
import { IntercompanyJournalEntryEntity } from '../entities/intercompany-journal-entry.entity';

export const intercompanyJournalEntryInclude = {
  lines: {
    include: {
      analyticalLines: true,
    },
  },
} satisfies Prisma.IntercompanyJournalEntryInclude;

export type IntercompanyJournalEntryWithRelations = Prisma.IntercompanyJournalEntryGetPayload<{
  include: typeof intercompanyJournalEntryInclude;
}>;

export type IntercompanyLine = IntercompanyJournalEntryWithRelations['lines'][number];

/**
 * Maps the journal entry lines analytics to a flat structure.
 */
function mapIntercompanyAnalyticLineToEntity(
  dimensions: IntercompanyLine['analyticalLines'],
): CommonDimensionEntity | undefined {
  if (!dimensions) return undefined;

  for (const key in dimensions) {
    if (Object.prototype.hasOwnProperty.call(dimensions, key)) {
      const value = dimensions[key as keyof DimensionsInput];

      if (value) {
        const dimensionsDetail: CommonDimensionEntity = {
          fixture: value.dimension1,
          broker: value.dimension2,
          department: value.dimension3,
          location: value.dimension4,
          type: value.dimension5,
          product: value.dimension6,
          analysis: value.dimension7,
        };

        return dimensionsDetail;
      }
    }
  }
}

/**
 * Maps the journal entry lines to a flat structure.
 */
function mapIntercompanyLineToEntity(context: IntercompanyLine): IntercompanyJournalEntryLineEntity {
  const entity: IntercompanyJournalEntryLineEntity = {
    journalEntryType: '',
    account: context.account1,
    businessPartner: context.businessPartner,
    debitOrCredit: context.sign === LocalMenus.SignByDefault.DEBIT ? SignByDefaultGQL.debit : SignByDefaultGQL.credit,
    quantity: context.quantity.toNumber(),
    lineDescription: context.lineDescription,
    tax: context.tax,
    nonFinancialUnit: context.nonFinancialUnit,
    site: context.site ?? '',
    company: context.company ?? '',
    currency: context.transactionCurrency,
    dimensions: mapIntercompanyAnalyticLineToEntity(context.analyticalLines),
  };

  return entity;
}

/**
 * Maps the journal entry to a flat structure.
 */
export function mapIntercompanyJournalEntryToEntity(
  journalEntry: IntercompanyJournalEntryWithRelations,
): IntercompanyJournalEntryEntity {
  return {
    journalEntryType: journalEntry.journalEntryType,
    journalEntryNumber: journalEntry.journalEntryNumber,
    company: journalEntry.company,
    site: journalEntry.site,
    journal: journalEntry.journal,
    accountingDate: journalEntry.accountingDate ?? undefined,
    currency: journalEntry.currency ?? undefined,
    description: journalEntry.description ?? undefined,
    rateDate: journalEntry.rateDate ?? undefined,
    rateType: ExchangeRateTypeToExchangeRateTypeGQL[journalEntry.rateType] ?? undefined,
    journalEntryStatus:
      AccountingJournalStatusToAccountingJournalStatusGQL[journalEntry.journalEntryStatus] ?? undefined,
    journalEntryLines: journalEntry.lines.map(mapIntercompanyLineToEntity),
  };
}
