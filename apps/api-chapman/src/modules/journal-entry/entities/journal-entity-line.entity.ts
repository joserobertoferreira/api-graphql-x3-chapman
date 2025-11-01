import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { LedgerTypeGQL, SignByDefaultGQL } from '../../../common/registers/enum-register';
import { JournalEntryAnalyticalLineEntity } from './journal-entry-analytic.entity';

@ObjectType('JournalEntryLine')
export class JournalEntryLineEntity {
  @Field(() => ID, { description: 'Journal entry type identifier.' })
  journalEntryType: string;

  @Field(() => ID, { description: 'Journal entry line identifier.' })
  journalEntryLine: string;

  @Field(() => Int, { nullable: true, description: 'Line number of the analytical line.' })
  lineNumber?: number;

  @Field(() => LedgerTypeGQL, { description: 'Ledger type.' })
  ledgerTypeNumber: LedgerTypeGQL;

  @Field(() => String, { nullable: true, description: 'Site code.' })
  site?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Accounting date.' })
  accountingDate?: Date;

  @Field(() => String, { nullable: true, description: 'Account.' })
  account?: string;

  @Field(() => String, { nullable: true, description: 'Business partner code.' })
  businessPartner?: string;

  @Field(() => String, { nullable: true, description: 'Plan account code.' })
  chartOfAccount?: string;

  @Field(() => String, { nullable: true, description: 'Control account code.' })
  controlAccount?: string;

  @Field(() => SignByDefaultGQL, { nullable: true, description: 'Debit or credit indicator.' })
  debitOrCredit?: SignByDefaultGQL;

  @Field(() => String, { description: 'Currency code.' })
  transactionCurrency: string;

  @Field(() => Float, { nullable: true, description: 'Amount in the journal entry currency.' })
  transactionAmount?: number;

  @Field(() => String, { description: 'Currency ledger code.' })
  ledgerCurrency: string;

  @Field(() => Float, { nullable: true, description: 'Amount in the ledger currency.' })
  ledgerAmount?: number;

  @Field(() => String, { nullable: true, description: 'Non-financial Unit' })
  nonFinancialUnit?: string;

  @Field(() => Float, { nullable: true, description: 'Quantity in the journal entry.' })
  quantity?: number;

  @Field(() => String, { nullable: true, description: 'Line description.' })
  lineDescription?: string;

  @Field(() => String, { nullable: true, description: 'Tax code.' })
  tax?: string;

  @Field(() => [JournalEntryAnalyticalLineEntity], { nullable: 'itemsAndList', description: 'Analytical lines.' })
  analyticalLines?: JournalEntryAnalyticalLineEntity[];
}
