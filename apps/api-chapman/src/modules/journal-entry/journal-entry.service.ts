import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { CounterService } from '../../common/counter/counter.service';
import { CommonService } from '../../common/services/common.service';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { JournalEntryContext, JournalEntrySequenceNumber } from '../../common/types/journal-entry.types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJournalEntryInput } from './dto/create-journal-entry.input';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { buildJournalEntryPayloads, buildOpenItemArchivePayload } from './helpers/journal-entry-payload-builder';
import { journalEntryInclude, mapJournalEntryToEntity } from './helpers/journal-entry.mapper';
import { JournalEntryValidationService } from './validators/journal-entry-validation.service';

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
      await test_validation(context as JournalEntryContext, this.sequenceNumberService, this.prisma);
      console.log('Debug mode is ON. Journal entry creation is skipped.');
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

        // Build the journal entry payloads
        const { payload, openItems } = await buildJournalEntryPayloads(context as JournalEntryContext, uniqueNumbers);

        // Build the open item archive payloads
        let archives: Prisma.OpenItemArchiveCreateInput[] = [];

        if (openItems && openItems.length > 0) {
          const idPromises = openItems.map(() => {
            return this.commonService.getNextSequenceValue({ sequenceName: 'SEQ_HISTODUD', transaction: tx });
          });

          const identifiers = await Promise.all(idPromises);

          archives = buildOpenItemArchivePayload(openItems[0], identifiers);
        }

        // Get the next unique number for the journal entry
        const newEntryNumber = await this.getNextEntryNumber(tx, {
          counter: context.documentType.sequenceNumber ?? 'GEN',
          company: context.company ?? '',
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

        // Create open items if any
        if (openItems && openItems.length > 0) {
          openItems.forEach((item) => {
            item.documentNumber = newEntryNumber;
          });
          await tx.openItem.createMany({ data: openItems });

          // Create open item archives if any
          if (archives && archives.length > 0) {
            archives.forEach((archive) => {
              archive.document = newEntryNumber;
            });
            await tx.openItemArchive.createMany({ data: archives });
          }
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
   * Get the next entry number for a given journal entry type.
   */
  async getNextEntryNumber(tx: PrismaTransactionClient, args: JournalEntrySequenceNumber): Promise<string> {
    const { counter, company, site, accountingDate, journal } = args;

    // Get the next counter value for the journal entry type
    const nextCounterValue = await this.sequenceNumberService.getNextCounterTransaction(
      tx,
      counter,
      company,
      site,
      accountingDate,
      journal,
    );

    return nextCounterValue;
  }
}

// Helper function for testing validation (should be outside the class)
async function test_validation(
  context: JournalEntryContext,
  sequenceNumberService: CounterService,
  prisma: PrismaService,
) {
  const uniqueNumbers = context.lines.map((_, index) => index + 1); // Temporary unique numbers for testing

  // Build the journal entry payloads
  // const { payload, openItems } = await buildJournalEntryPayloads(context, uniqueNumbers);

  // Get the next counter value for the journal entry type
  // const nextCounterValue = await sequenceNumberService.getNextCounterTransaction(
  //   prisma as PrismaTransactionClient,
  //   context.documentType.sequenceNumber ?? 'GEN',
  //   context.company ?? '',
  //   context.site ?? '',
  //   context.accountingDate,
  //   context.documentType.defaultJournal ?? '',
  // );

  console.log('------------------------------');
  // console.log('context', context);
  // console.log('------------------------------');
  // console.log('payload', payload.lines);
  // console.log('------------------------------');
  // console.log('openItems', openItems);
  // console.log('------------------------------');
}
