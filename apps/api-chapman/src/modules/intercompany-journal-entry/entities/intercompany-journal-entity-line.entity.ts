import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { SignByDefaultGQL } from '../../../common/registers/enum-register';
import { JournalEntryDimensionEntity } from '../../journal-entry/entities/journal-entry-analytic.entity';

@ObjectType('IntercompanyJournalEntryLine')
export class IntercompanyJournalEntryLineEntity {
  @Field(() => ID, { description: 'Journal entry type identifier.' })
  journalEntryType: string;

  @Field(() => String, { description: 'Site code.' })
  site: string;

  @Field(() => String, { nullable: true, description: 'Company code.' })
  company: string;

  @Field(() => String, { description: 'Currency code.' })
  currency: string;

  @Field(() => String, { nullable: true, description: 'Account.' })
  account?: string;

  @Field(() => String, { nullable: true, description: 'Business partner code.' })
  businessPartner?: string;

  @Field(() => SignByDefaultGQL, { nullable: true, description: 'Debit or credit indicator.' })
  debitOrCredit?: SignByDefaultGQL;

  @Field(() => String, { nullable: true, description: 'Non-financial Unit' })
  nonFinancialUnit?: string;

  @Field(() => Float, { nullable: true, description: 'Quantity in the journal entry.' })
  quantity?: number;

  @Field(() => String, { nullable: true, description: 'Line description.' })
  lineDescription?: string;

  @Field(() => String, { nullable: true, description: 'Tax code.' })
  tax?: string;

  @Field(() => JournalEntryDimensionEntity, {
    nullable: true,
    description: 'Dimensions associated with this line.',
  })
  dimensions?: JournalEntryDimensionEntity;
}
