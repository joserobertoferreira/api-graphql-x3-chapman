import { LocalMenus } from '@chapman/utils';
import { Prisma } from 'src/generated/prisma';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';
import { SignByDefaultGQL } from '../../../common/registers/enum-register';
import { AccountingJournalStatusToAccountingJournalStatusGQL } from '../../../common/utils/enums/convert-enum';
import { JournalEntryDimensionEntity } from '../../journal-entry/entities/journal-entry-analytic.entity';
import { IntercompanyJournalEntryLineEntity } from '../entities/intercompany-journal-entity-line.entity';
import { IntercompanyJournalEntryEntity } from '../entities/intercompany-journal-entry.entity';

export const intercompanyJournalEntryInclude = Prisma.validator<Prisma.IntercompanyJournalEntryInclude>()({
  lines: {
    include: {
      analyticalLines: true,
    },
  },
});

export type IntercompanyJournalEntryWithRelations = Prisma.IntercompanyJournalEntryGetPayload<{
  include: typeof intercompanyJournalEntryInclude;
}>;

export type IntercompanyLine = IntercompanyJournalEntryWithRelations['lines'][number];

/**
 * Maps the journal entry lines analytics to a flat structure.
 */
function mapIntercompanyAnalyticLineToEntity(
  dimensions: IntercompanyLine['analyticalLines'],
): JournalEntryDimensionEntity | undefined {
  if (!dimensions) return undefined;

  const entity: JournalEntryDimensionEntity = {};

  for (const key in dimensions) {
    if (Object.prototype.hasOwnProperty.call(dimensions, key)) {
      const value = dimensions[key as keyof DimensionsInput];

      if (value) {
        const dimensionDetail: CommonDimensionEntity = { code: value };

        entity[key as keyof JournalEntryDimensionEntity] = dimensionDetail;
      }
    }
  }

  return Object.keys(entity).length > 0 ? entity : undefined;
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
    journalEntryStatus:
      AccountingJournalStatusToAccountingJournalStatusGQL[journalEntry.journalEntryStatus] ?? undefined,
    journalEntryLines: journalEntry.lines.map(mapIntercompanyLineToEntity),
  };
}
