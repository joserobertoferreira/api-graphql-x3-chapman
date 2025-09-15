import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { LedgerTypeGQL } from '../../../common/registers/enum-register';

@ObjectType('JournalEntryDimension')
export class JournalEntryDimensionEntity {
  @Field({ description: 'The type of this dimension.' })
  dimensionType: string;

  @Field({ description: 'The dimension value.' })
  dimension: string;
}

@ObjectType('JournalEntryAnalyticalLine')
export class JournalEntryAnalyticalLineEntity {
  @Field(() => ID, { description: 'Journal entry type identifier.' })
  journalEntryType: string;

  @Field(() => ID, { description: 'Journal entry line identifier.' })
  journalEntryLine: string;

  @Field(() => Int, { description: 'Line number of the analytical line.' })
  lineNumber: number;

  @Field(() => LedgerTypeGQL, { description: 'Ledger type.' })
  ledgerTypeNumber: LedgerTypeGQL;

  @Field(() => Int, { nullable: true, description: 'Analytical line number.' })
  analyticalLineNumber?: number;

  @Field(() => String, { nullable: true, description: 'Site code.' })
  site?: string;

  @Field(() => [JournalEntryDimensionEntity], {
    nullable: 'itemsAndList',
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: JournalEntryDimensionEntity[];

  @Field(() => Float, { nullable: true, description: 'Amount in the journal entry currency.' })
  transactionAmount?: number;
}
