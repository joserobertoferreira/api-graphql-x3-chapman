import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryInput } from './dto/journal-entry.input';
import { JournalEntryValidationService } from './journal-entry-validation.service';

@Injectable()
export class JournalEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalEntryValidator: JournalEntryValidationService,
  ) {}

  /**
   * Create a new journal entry.
   * @param input - The data to create the journal entry.
   * @returns The created journal entry.
   */
  async create(input: CreateJournalEntryInput): Promise<any> {
    const context = await this.journalEntryValidator.validate(input);

    // const journalEntry = await this.prisma.journalEntry.create({
    //   data: {
    //     entryDate: input.entryDate,
    //     description: input.description,
    //   },
    // });

    // return journalEntry;

    return 'Journal entry creation is not yet implemented.';
  }
}
