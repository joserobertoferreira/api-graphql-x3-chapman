import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { BaseResolver } from '../../../common/resolvers/base.resolver';
import { CreateJournalEntryInput, JournalEntryInputUnique } from './dto/create-journal-entry.input';
import { JournalEntryEntity, JournalEntryStatusEntity } from './entities/journal-entry.entity';
import { JournalEntryService } from './journal-entry.service';

@Resolver()
export class JournalEntryResolver extends BaseResolver {
  constructor(private readonly journalEntryService: JournalEntryService) {
    super();
  }

  /**
   * Create a new journal entry
   * Wrapped in try/catch to ensure GraphQL errors are properly formatted
   */
  @Mutation(() => JournalEntryEntity, { name: 'createJournalEntry' })
  async createJournalEntry(
    @Args('input', { type: () => CreateJournalEntryInput }) input: CreateJournalEntryInput,
  ): Promise<JournalEntryEntity> {
    try {
      // Await the service call to catch any async errors
      const result = await this.journalEntryService.create(input);
      return result;
    } catch (error) {
      // Re-throw to let the GqlHttpExceptionFilter handle it
      // This ensures UserInputError and other errors are properly formatted
      console.error('Error in createJournalEntry resolver:', error);
      throw error;
    }
  }

  @Query(() => JournalEntryStatusEntity, { name: 'getJournalEntryStatus' })
  async getJournalEntryStatus(
    @Args('input', { type: () => JournalEntryInputUnique }) input: JournalEntryInputUnique,
  ): Promise<JournalEntryStatusEntity> {
    try {
      const result = await this.journalEntryService.getStatus(input.journalEntryNumber);
      return result;
    } catch (error) {
      console.error('Error in getJournalEntryStatus resolver:', error);
      throw error;
    }
  }
}
