import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CounterService } from '../../common/counter/counter.service';
import { CommonService } from '../../common/services/common.service';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { JournalEntryContext } from '../../common/types/journal-entry.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryInput } from './dto/journal-entry.input';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { journalEntryInclude, mapJournalEntryToEntity } from './helpers/journal-entity.mapper';
import { buildJournalEntryPayloads } from './helpers/journal-entry-payload-builder';
import { JournalEntryValidationService } from './journal-entry-validation.service';

interface JournalEntrySequenceNumber {
  counter: string;
  site: string;
  accountingDate: Date;
  journal: string;
}

@Injectable()
export class JournalEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly sequenceNumberService: CounterService,
    private readonly journalEntryValidator: JournalEntryValidationService,
  ) {}

  /**
   * Get a single journal entry by Journal Entry Type and Journal Entry Number.
   * @param journalEntryType - The type of the journal entry.
   * @param journalEntryNumber - The number of the journal entry.
   * @returns The journal entry if found, otherwise null.
   */
  async findOne(journalEntryType: string, journalEntryNumber: string): Promise<JournalEntryEntity> {
    const journalEntry = await this.prisma.journalEntry.findUnique({
      where: { journalEntryType_journalEntryNumber: { journalEntryType, journalEntryNumber } },
      include: journalEntryInclude,
    });

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry ${journalEntryType} - ${journalEntryNumber} not found.`);
    }

    return mapJournalEntryToEntity(journalEntry);
  }

  /**
   * Create a new journal entry.
   * @param input - The data to create the journal entry.
   * @returns The created journal entry.
   */
  async create(input: CreateJournalEntryInput, debug: boolean): Promise<JournalEntryEntity> {
    // Validate the input data
    const context = await this.journalEntryValidator.validate(input);

    if (debug) {
      await test_validation(context); // TODO: Remove after testing
      return {} as JournalEntryEntity; // Temporary return for testing
    }

    // Persist the journal entry and its lines in the database
    const createdEntry = await this.prisma.$transaction(
      async (tx) => {
        // Build the unique number payload
        const uniquePromises = context.lines.map(() => {
          return this.commonService.getNextSequenceValue({ sequenceName: 'SEQ_GACCENTRYD', transaction: tx });
        });

        const uniqueNumbers = await Promise.all(uniquePromises);

        // const uniqueNumbers = context.lines.map((_, index) => index + 1); // Temporary unique numbers for testing

        // Build the journal entry payloads
        const { payload, openItems } = await buildJournalEntryPayloads(context, uniqueNumbers);

        // Get the next unique number for the journal entry
        const newEntryNumber = await this.getNextOrderNumber(tx, {
          counter: context.documentType.sequenceNumber ?? 'GEN',
          site: context.site ?? '',
          accountingDate: context.accountingDate,
          journal: context.documentType.defaultJournal ?? '',
        });

        const newJournalEntry = tx.journalEntry.create({
          data: {
            journalEntryNumber: newEntryNumber,
            ...payload,
          },
          include: {
            lines: {
              include: {
                analytics: true,
              },
            },
          },
        });

        if (!newJournalEntry) {
          throw new Error('Fatal error: The journal entry could not be created.');
        }

        return newJournalEntry;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const result = await this.prisma.journalEntry.findUniqueOrThrow({
      where: {
        journalEntryType_journalEntryNumber: {
          journalEntryType: createdEntry.journalEntryType,
          journalEntryNumber: createdEntry.journalEntryNumber,
        },
      },
      include: journalEntryInclude,
    });

    return mapJournalEntryToEntity(result);
  }

  /**
   * Get the next order number for a given journal entry type.
   */
  async getNextOrderNumber(tx: PrismaTransactionClient, args: JournalEntrySequenceNumber): Promise<string> {
    const { counter, site, accountingDate, journal } = args;

    // Get the next counter value for the journal entry type
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      counter,
      site,
      accountingDate,
      journal,
    );

    return nextCounterValue;
  }
}

// Helper function for testing validation (should be outside the class)
async function test_validation(context: JournalEntryContext) {
  const uniqueNumbers = context.lines.map((_, index) => index + 1); // Temporary unique numbers for testing

  // Build the journal entry payloads
  const { payload, openItems } = await buildJournalEntryPayloads(context, uniqueNumbers);

  console.log('payload', payload);
  console.log('openItems', openItems);
}
