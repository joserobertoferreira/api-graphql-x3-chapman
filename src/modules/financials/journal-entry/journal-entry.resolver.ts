import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BaseResolver } from '../../../common/resolvers/base.resolver';
import { CreateJournalEntryInput, JournalEntryInputUnique } from './dto/create-journal-entry.input';
import { JournalEntryEntity, JournalEntryStatusEntity } from './entities/journal-entry.entity';
import { JournalEntryService } from './journal-entry.service';

// @Resolver(() => JournalEntryEntity)
@Resolver()
export class JournalEntryResolver extends BaseResolver {
  constructor(private readonly journalEntryService: JournalEntryService) {
    super();
  }

  @Mutation(() => JournalEntryEntity, { name: 'createJournalEntry' })
  createJournalEntry(@Args('input', { type: () => CreateJournalEntryInput }) input: CreateJournalEntryInput) {
    return this.journalEntryService.create(input, false);
  }

  @Query(() => JournalEntryStatusEntity, { name: 'getJournalEntryStatus' })
  getJournalEntryStatus(@Args('input', { type: () => JournalEntryInputUnique }) input: JournalEntryInputUnique) {
    return this.journalEntryService.getStatus(input.journalEntryNumber);
  }
}
