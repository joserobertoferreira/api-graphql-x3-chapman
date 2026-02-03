import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaTransactionClient } from '../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { PrismaClient, TextCounter } from '../../generated/prisma/client';

@Injectable()
export class DocumentTextService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the next formatted text number according to a counter definition.
   * @param tx The Prisma transaction client.
   * @param tableAbbreviation The table abbreviation for which to get the next text number (e.g, 'SOQ').
   * @returns The formatted string of the next text number.
   * @throws NotFoundException if the text sequence definition is not found.
   * @throws Error if an error occurs during number generation.
   */
  public async getNextTextNumber(tx: PrismaTransactionClient, tableAbbreviation: string): Promise<string> {
    return this.getNextCounterInternal(tx, tableAbbreviation);
  }

  /**
   * Internal method to get the next text number within a transaction.
   * @param tx The Prisma transaction client.
   * @param tableAbbreviation The table abbreviation for which to get the next text number (e.g, 'SOQ').
   * @returns The formatted string of the next text number.
   * @private
   */
  private async getNextCounterInternal(
    tx: PrismaTransactionClient | PrismaClient,
    tableAbbreviation: string,
  ): Promise<string> {
    // Attempts to get the counter definition
    const counterData = await tx.textCounter.findUnique({
      where: { tableAbbreviation: tableAbbreviation },
    });

    if (!counterData) {
      throw new NotFoundException(`Definição do contador '${tableAbbreviation}' não encontrada.`);
    }

    const counter = await this.createNextCounter(tx, counterData);

    return counter;
  }

  /**
   * Retrieves and increments the counter value in the database in a transactional and safe manner.
   * @returns The next counter value, already formatted with zero padding.
   * @private
   */
  private async createNextCounter(
    tx: PrismaTransactionClient | PrismaClient,
    counterData: TextCounter,
  ): Promise<string> {
    const currentValue = counterData ? Number(counterData.textSequence) : 1;

    console.log(`[DocumentTextService] Current value for '${counterData.tableAbbreviation}': ${currentValue}`);
    const nextValue = currentValue + 1;
    console.log(`[DocumentTextService] Next value for '${counterData.tableAbbreviation}': ${nextValue}`);
    const timestamps = getAuditTimestamps();

    await tx.textCounter.upsert({
      where: { tableAbbreviation: counterData.tableAbbreviation },
      update: {
        textSequence: nextValue,
        updateDatetime: timestamps.dateTime,
      },
      create: {
        tableAbbreviation: counterData.tableAbbreviation,
        textSequence: nextValue,
        createDatetime: timestamps.dateTime,
        updateDatetime: timestamps.dateTime,
        singleID: generateUUIDBuffer().slice(0),
      },
    });

    const formattedNext = nextValue.toString().padStart(8, '0');

    if (formattedNext.length > 8) {
      // Esta exceção causará o rollback da transação
      throw new Error(
        `The next value (${nextValue}) for the text sequence '${counterData.tableAbbreviation}' exceeds the maximum length of 8 digits.`,
      );
    }

    return formattedNext;
  }
}
