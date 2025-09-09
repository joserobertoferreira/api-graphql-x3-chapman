import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';

@ObjectType('JournalEntry')
export class JournalEntryEntity {
  @Field(() => ID, { description: 'Unique identifier for the journal entry.' })
  journalEntryNumber!: string;

  @Field(() => GraphQLDate, { description: 'Date of the journal entry.' })
  accountingDate!: Date;
}
