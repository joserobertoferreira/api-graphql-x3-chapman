import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateIntercompanyJournalEntryInput } from './dto/create-intercompany-journal-entry.input';
import { IntercompanyJournalEntryEntity } from './entities/intercompany-journal-entry.entity';
import { IntercompanyJournalEntryService } from './intercompany-journal-entry.service';

@Resolver(() => IntercompanyJournalEntryEntity)
export class IntercompanyJournalEntryResolver {
  constructor(private readonly intercompanyJournalEntryService: IntercompanyJournalEntryService) {}

  @Mutation(() => IntercompanyJournalEntryEntity, { name: 'createIntercompanyJournalEntry' })
  createIntercompanyJournalEntry(
    @Args('input', { type: () => CreateIntercompanyJournalEntryInput }) input: CreateIntercompanyJournalEntryInput,
  ) {
    return this.intercompanyJournalEntryService.create(input, false);
  }
}
