import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { AccountingJournalStatusGQL } from '../../../common/registers/enum-register';
import { JournalEntryLineEntity } from './journal-entity-line.entity';

@ObjectType('JournalEntry')
export class JournalEntryEntity {
  @Field(() => ID, { description: 'Journal entry type identifier.' })
  journalEntryType: string;

  @Field(() => ID, { description: 'Journal entry number identifier.' })
  journalEntryNumber: string;

  @Field(() => String, { description: 'Company code.' })
  company: string;

  @Field(() => String, { description: 'Site code.' })
  site: string;

  @Field(() => String, { description: 'Journal code.' })
  journal: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date.' })
  accountingDate?: Date;

  @Field(() => AccountingJournalStatusGQL, { nullable: true, description: 'Status of the journal entry.' })
  journalEntryStatus?: AccountingJournalStatusGQL;

  @Field(() => String, { description: 'Journal entry transaction.' })
  journalEntryTransaction: string;

  @Field(() => String, { description: 'Transaction currency.' })
  transactionCurrency: string;

  @Field(() => [JournalEntryLineEntity], { description: 'Journal entry lines.' })
  journalEntryLines: JournalEntryLineEntity[];
}
