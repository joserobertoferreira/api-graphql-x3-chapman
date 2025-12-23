import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { BaseResolver } from '../../../common/resolvers/base.resolver';
import { CreateIntercompanyJournalEntryInput } from './dto/create-intercompany-journal-entry.input';
import { IntercompanyJournalEntryEntity } from './entities/intercompany-journal-entry.entity';
import { IntercompanyJournalEntryService } from './intercompany-journal-entry.service';

@Resolver(() => IntercompanyJournalEntryEntity)
export class IntercompanyJournalEntryResolver extends BaseResolver {
  constructor(private readonly intercompanyJournalEntryService: IntercompanyJournalEntryService) {
    super();
  }

  @Mutation(() => IntercompanyJournalEntryEntity, { name: 'createIntercompanyJournalEntry' })
  createIntercompanyJournalEntry(
    @Args('input', { type: () => CreateIntercompanyJournalEntryInput }) input: CreateIntercompanyJournalEntryInput,
  ) {
    return this.intercompanyJournalEntryService.create(input, false);
  }
}
