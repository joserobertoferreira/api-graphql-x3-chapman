import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from 'src/common/context/request-context.service';
import { CounterService } from 'src/common/counter/counter.service';
import { PrismaTransactionClient } from 'src/common/types/common.types';
import { JournalEntryContext, JournalEntrySequenceNumber } from 'src/common/types/journal-entry.types';
import { AccountingJournalStatusToAccountingJournalStatusGQL } from 'src/common/utils/enums/convert-enum';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonService } from '../../common/common.service';
import { CreateJournalEntryInput } from './dto/create-journal-entry.input';
import { JournalEntryEntity, JournalEntryStatusEntity } from './entities/journal-entry.entity';
import { buildJournalEntryPayloads, buildOpenItemArchivePayload } from './helpers/journal-entry-payload-builder';
import {
  journalEntryInclude,
  JournalEntryWithRelations,
  mapJournalEntryToEntity,
} from './helpers/journal-entry.mapper';
import { JournalEntryValidationService } from './validators/journal-entry-validation.service';

@Injectable()
export class JournalEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly sequenceNumberService: CounterService,
    private readonly journalEntryValidator: JournalEntryValidationService,
    private readonly requestContextService: RequestContextService,
  ) {}

  /**
   * Get a single journal entry by Journal Entry Type and Journal Entry Number.
   * @param journalEntryNumber - The number of the journal entry.
   * @param journalEntryType - (Optional) The type of the journal entry.
   * @returns The journal entry if found, otherwise null.
   * @throws NotFoundException if the journal entry is not found.
   */
  async findOne(journalEntryNumber: string, journalEntryType?: string): Promise<JournalEntryEntity> {
    let journalEntry: JournalEntryWithRelations | null = null;

    if (journalEntryType) {
      journalEntry = await this.prisma.journalEntry.findUnique({
        where: { journalEntryType_journalEntryNumber: { journalEntryType, journalEntryNumber } },
        include: journalEntryInclude,
      });
    } else {
      journalEntry = await this.prisma.journalEntry.findFirst({
        where: { journalEntryNumber },
        include: journalEntryInclude,
        orderBy: { journalEntryNumber: 'desc' },
      });
    }

    if (!journalEntry) {
      const errorMessage = journalEntryType
        ? `Journal entry ${journalEntryType} - ${journalEntryNumber} not found.`
        : `Journal entry with number ${journalEntryNumber} not found.`;

      throw new NotFoundException(errorMessage);
    }

    return mapJournalEntryToEntity(journalEntry, false);
  }

  /**
   * Get the journal entry status.
   * @param journalEntryNumber - The number of the journal entry.
   * @returns The journal entry status.
   * @throws NotFoundException if the journal entry is not found.
   */
  async getStatus(journalEntryNumber: string): Promise<JournalEntryStatusEntity> {
    const journalEntry = await this.prisma.journalEntry.findFirst({
      where: { journalEntryNumber },
      select: { journalEntryType: true, journalEntryNumber: true, journalEntryStatus: true },
    });

    if (!journalEntry) {
      throw new NotFoundException(`Journal entry with number ${journalEntryNumber} not found.`);
    }

    return {
      journalEntryType: journalEntry.journalEntryType,
      journalEntryNumber: journalEntry.journalEntryNumber,
      journalEntryStatus: AccountingJournalStatusToAccountingJournalStatusGQL[journalEntry.journalEntryStatus],
    };
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

    const currentUser = this.requestContextService.getCurrentUser();
    let isExcel = this.requestContextService.getIsExcel();

    if (!isExcel) {
      isExcel = false;
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
        const { payload, openItems } = await buildJournalEntryPayloads(
          context as JournalEntryContext,
          uniqueNumbers,
          currentUser,
        );

        // Build the open item archive payloads
        let archives: Prisma.OpenItemArchiveCreateInput[] = [];

        if (openItems && openItems.length > 0) {
          const idPromises = openItems.map(() => {
            return this.commonService.getNextSequenceValue({ sequenceName: 'SEQ_HISTODUD', transaction: tx });
          });

          const identifiers = await Promise.all(idPromises);

          archives = buildOpenItemArchivePayload(openItems[0], identifiers, currentUser);
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

    return mapJournalEntryToEntity(result, isExcel);
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
