import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { CounterService } from '../../common/counter/counter.service';
import { CommonService } from '../../common/services/common.service';
import { IntercompanyJournalEntrySequenceNumber, PrismaTransactionClient } from '../../common/types/common.types';
import {
  IntercompanyEntrySequenceNumber,
  IntercompanyJournalEntryContext,
} from '../../common/types/journal-entry.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIntercompanyJournalEntryInput } from './dto/create-intercompany-journal-entry.input';
import { IntercompanyJournalEntryEntity } from './entities/intercompany-journal-entry.entity';
import { buildIntercompanyJournalEntryPayloads } from './helpers/intercompany-journal-entry-payload-builder';
import { mapIntercompanyJournalEntryToEntity } from './helpers/intercompany-journal-entry.mapper';
import { IntercompanyJournalEntryValidationService } from './validators/intercompany-journal-entry-validation.service';

@Injectable()
export class IntercompanyJournalEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly sequenceNumberService: CounterService,
    private readonly intercompanyJournalEntryValidator: IntercompanyJournalEntryValidationService,
  ) {}

  /**
   * Create a new intercompany journal entry.
   * @param input - The data to create the intercompany journal entry.
   * @returns The created intercompany journal entry.
   */
  async create(input: CreateIntercompanyJournalEntryInput, debug: boolean): Promise<IntercompanyJournalEntryEntity> {
    // Validate the input data
    const context = await this.intercompanyJournalEntryValidator.validate(input);

    if (debug) {
      await test_validation(context, this.prisma, this.sequenceNumberService, this.commonService);
      console.log('Debug mode is ON. Journal entry creation is skipped.');
      return {} as IntercompanyJournalEntryEntity; // Temporary return for testing
    }

    // Persist the journal entry and its lines in the database
    const createdEntry = await this.prisma.$transaction(
      async (tx) => {
        // Build the journal entry payloads
        const payload = await buildIntercompanyJournalEntryPayloads(context);

        // Get the next unique number for the journal entry
        const newEntryNumber = await this.getNextEntryNumber(tx, {
          company: '',
          site: context.site,
          legislation: context.legislation,
          accountingDate: context.accountingDate,
          complement: '',
        });

        const newJournalEntry = tx.intercompanyJournalEntry.create({
          data: {
            journalEntryNumber: newEntryNumber,
            ...payload,
          },
          include: {
            lines: {
              include: {
                analyticalLines: true,
              },
            },
          },
        });

        if (!newJournalEntry) {
          throw new Error('Fatal error: The intercompany journal entry could not be created.');
        }

        return newJournalEntry;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const result = await this.prisma.intercompanyJournalEntry.findUniqueOrThrow({
      where: {
        journalEntryNumber: createdEntry.journalEntryNumber,
      },
      include: {
        lines: {
          include: {
            analyticalLines: true,
          },
        },
      },
    });

    return mapIntercompanyJournalEntryToEntity(result);
  }

  /**
   * Get the next entry number for a given journal entry type.
   */
  async getNextEntryNumber(tx: PrismaTransactionClient, args: IntercompanyEntrySequenceNumber): Promise<string> {
    const { company, legislation, site, accountingDate, complement } = args;

    const sequenceNumbers = await this.commonService.getIntercompanyJournalEntrySequenceNumber(['', legislation]);
    if (!sequenceNumbers || sequenceNumbers.length === 0) {
      throw new Error(`Sequence number for intercompany journal entry not found.`);
    }

    let sequenceNumber: string;

    // Helper function to find a valid record
    const findValidRecord = (sequence: string): IntercompanyJournalEntrySequenceNumber | undefined => {
      const record = sequenceNumbers.find((rec) => rec.counter.trim() === sequence);
      if (record && record.counter && record.counter.trim() !== '') {
        return record;
      }
      return undefined;
    };

    // Try to find for the specified legislation
    let counter = findValidRecord(legislation);

    // If not found, try to fetch for the blank legislation
    if (!counter) {
      console.log('No sequence number found for legislation:', legislation, 'trying default');
      counter = findValidRecord('');
      console.log(counter);
    }

    if (counter) {
      sequenceNumber = counter.counter.trim();
    } else {
      sequenceNumber = 'INTCO';
    }

    // Get the next counter value for the intercompany journal entry type
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      sequenceNumber,
      company,
      site,
      accountingDate,
      complement,
    );

    return nextCounterValue;
  }
}

// Helper function for testing validation (should be outside the class)
async function test_validation(
  context: IntercompanyJournalEntryContext,
  prisma: PrismaService,
  sequenceNumberService: CounterService,
  commonService: CommonService,
) {
  // Build the journal entry payloads
  const payload = await buildIntercompanyJournalEntryPayloads(context);

  console.log('------------------------------');
  console.log('context', context);
  console.log('------------------------------');
  console.log('payload', payload);
}
