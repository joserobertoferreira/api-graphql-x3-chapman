import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { AccountingJournalStatusGQL, ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { IntercompanyJournalEntryLineEntity } from './intercompany-journal-entity-line.entity';

@ObjectType('IntercompanyJournalEntry')
export class IntercompanyJournalEntryEntity {
  @Field(() => String, { description: 'Site code.' })
  site: string;

  @Field(() => String, { nullable: true, description: 'Company code.' })
  company?: string;

  @Field(() => ID, { description: 'Journal entry type identifier.' })
  journalEntryType: string;

  @Field(() => ID, { description: 'Journal entry number identifier.' })
  journalEntryNumber: string;

  @Field(() => String, { nullable: true, description: 'Description' })
  description?: string;

  @Field(() => AccountingJournalStatusGQL, { nullable: true, description: 'Status of the journal entry.' })
  journalEntryStatus?: AccountingJournalStatusGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date.' })
  accountingDate: Date;

  @Field(() => String, { description: 'Journal code.' })
  journal: string;

  @Field(() => ExchangeRateTypeGQL, { nullable: true, description: 'Rate type.' })
  rateType?: ExchangeRateTypeGQL;

  @Field(() => GraphQLDate, { nullable: true, description: 'Rate date.' })
  rateDate?: Date;

  @Field(() => String, { nullable: true, description: 'Transaction currency.' })
  currency?: string;

  @Field(() => [IntercompanyJournalEntryLineEntity], { description: 'Journal entry lines.' })
  journalEntryLines: IntercompanyJournalEntryLineEntity[];
}
