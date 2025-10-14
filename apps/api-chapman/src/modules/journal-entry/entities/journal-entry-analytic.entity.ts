import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';
import { LedgerTypeGQL } from '../../../common/registers/enum-register';

@ObjectType('JournalEntryDimension')
export class JournalEntryDimensionEntity {
  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Fixture dimension detail.' })
  fixture?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Broker dimension detail.' })
  broker?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Department dimension detail.' })
  department?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Location dimension detail.' })
  location?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Type dimension detail.' })
  type?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Product dimension detail.' })
  product?: CommonDimensionEntity;

  @Field(() => CommonDimensionEntity, { nullable: true, description: 'Analysis dimension detail.' })
  analysis?: CommonDimensionEntity;
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

  @Field(() => JournalEntryDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this analytical line.',
  })
  dimensions?: JournalEntryDimensionEntity;

  @Field(() => Float, { nullable: true, description: 'Amount in the journal entry currency.' })
  transactionAmount?: number;
}
