import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateJournalEntryInput } from './dto/create-journal-entry.input';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { JournalEntryService } from './journal-entry.service';

@Resolver(() => JournalEntryEntity)
export class JournalEntryResolver {
  constructor(private readonly journalEntryService: JournalEntryService) {}

  @Mutation(() => JournalEntryEntity, { name: 'createJournalEntry' })
  createJournalEntry(@Args('input', { type: () => CreateJournalEntryInput }) input: CreateJournalEntryInput) {
    return this.journalEntryService.create(input, false);
  }
}
