import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { CommonDimensionEntity } from '../../../../common/outputs/common-dimension.entity';
import { LedgerTypeGQL } from '../../../../common/registers/enum-register';

@ObjectType('JournalEntryDimension')
export class JournalEntryDimensionEntity {
  @Field(() => String, { nullable: true, description: 'Fixture dimension detail.' })
  fixture?: string;

  @Field(() => String, { nullable: true, description: 'Broker dimension detail.' })
  broker?: string;

  @Field(() => String, { nullable: true, description: 'Department dimension detail.' })
  department?: string;

  @Field(() => String, { nullable: true, description: 'Location dimension detail.' })
  location?: string;

  @Field(() => String, { nullable: true, description: 'Type dimension detail.' })
  type?: string;

  @Field(() => String, { nullable: true, description: 'Product dimension detail.' })
  product?: string;

  @Field(() => String, { nullable: true, description: 'Analysis dimension detail.' })
  analysis?: string;
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

  @Field(() => CommonDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: CommonDimensionEntity;

  @Field(() => Float, { nullable: true, description: 'Amount in the journal entry currency.' })
  transactionAmount?: number;
}
