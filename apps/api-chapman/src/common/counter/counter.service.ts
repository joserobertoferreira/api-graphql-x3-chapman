import { LocalMenus } from '@chapman/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_LEGACY_DATE, PrismaTransactionClient } from '../types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../utils/audit-date.utils';

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets the next formatted document number according to a counter definition.
   * @param counterCode The sequence code of the counter (e.g., 'VENDA_NF').
   * @param company The company associated with the counter (optional).
   * @param site The site or company associated with the counter (optional).
   * @param date The reference date for the counter (optional, defaults to the current date).
   * @param comp An optional complement for the counter.
   * @returns The formatted string of the next counter number.
   * @throws NotFoundException if the counter definition is not found.
   * @throws Error if an error occurs during number generation.
   */
  public async getNextCounter(
    counterCode: string,
    company: string = '',
    site: string = '',
    date: Date = DEFAULT_LEGACY_DATE,
    comp: string = '',
  ): Promise<string> {
    // Begin transaction
    return this.prisma.$transaction(
      async (tx) => {
        // Call the internal method to get the next counter
        return this.getNextCounterInternal(tx, counterCode, company, site, date, comp);
      },
      {
        // Nível de isolamento crucial para alta concorrência e evitar race conditions
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // 5 segundos
        timeout: 10000, // 10 segundos
      },
    );
  }

  /**
   * Gets the next formatted document number according to a counter definition.
   * @param tx The Prisma transaction client.
   * @param counterCode The sequence code of the counter (e.g., 'VENDA_NF').
   * @param site The site or company associated with the counter (optional).
   * @param date The reference date for the counter (optional, defaults to the current date).
   * @param comp An optional complement for the counter.
   * @returns The formatted string of the next counter number.
   * @throws NotFoundException if the counter definition is not found.
   * @throws Error if an error occurs during number generation.
   */
  public async getNextCounterTransaction(
    tx: PrismaTransactionClient,
    counterCode: string,
    company: string = '',
    site: string = '',
    date: Date = DEFAULT_LEGACY_DATE,
    comp: string = '',
  ): Promise<string> {
    return this.getNextCounterInternal(tx, counterCode, company, site, date, comp);
  }

  /**
   * Internal method to get the next counter number within a transaction.
   * @param tx The Prisma transaction client.
   * @param counterCode The sequence code of the counter (e.g., 'VENDA_NF').
   * @param company The company associated with the counter (optional).
   * @param site The site or company associated with the counter (optional).
   * @param date The reference date for the counter (optional, defaults to the current date).
   * @param comp An optional complement for the counter.
   * @returns The formatted string of the next counter number.
   * @private
   */
  private async getNextCounterInternal(
    tx: PrismaTransactionClient | PrismaClient,
    counterCode: string,
    company: string = '',
    site: string = '',
    date: Date = DEFAULT_LEGACY_DATE,
    comp: string = '',
  ): Promise<string> {
    // Attempts to get the counter definition
    const counterData = await tx.documentNumbers.findUnique({
      where: { sequenceCode: counterCode },
    });

    if (!counterData) {
      throw new NotFoundException(`Definição do contador '${counterCode}' não encontrada.`);
    }

    // Transform the componentType, componentLength and constants into arrays for easier access
    const componentTypes: number[] = [];
    const componentLengths: number[] = [];
    const constants: string[] = [];

    for (let i = 1; i <= counterData.numberOfComponents; i++) {
      const type = `componentType${i}`;
      const length = `componentLength${i}`;
      const constant = `constants${i}`;

      if (counterData[type as keyof typeof counterData] !== undefined) {
        componentTypes.push(counterData[type as keyof typeof counterData] as number);
      }
      if (counterData[length as keyof typeof counterData] !== undefined) {
        componentLengths.push(counterData[length as keyof typeof counterData] as number);
      }
      if (counterData[constant as keyof typeof counterData] !== undefined) {
        constants.push(counterData[constant as keyof typeof counterData] as string);
      }
    }

    const index = componentTypes.indexOf(8);

    if (index === -1) {
      return '';
    }

    if (componentTypes.indexOf(9) === -1) {
      comp = '';
    }

    const lengthOfSequence: number = componentLengths[index] || 1;

    let finalCounter = '';

    const period = this.determinePeriod(counterData.rtzLevel, date);
    const siteOrSociety = await this.determineSiteOrSociety(tx, counterData.definitionLevel, company, site);
    const counter = await this.createNextCounter(tx, counterCode, siteOrSociety, period, comp, lengthOfSequence);

    // Generate the final counter string
    if (counter) {
      finalCounter = this.buildCounterString(
        counter,
        componentTypes,
        componentLengths,
        constants,
        counterData.numberOfComponents,
        counterData.chronologicalControl,
        counterData.type,
        date,
        company,
        site,
        comp,
      );
    }

    return finalCounter;
  }

  /**
   * Monta a string final do contador a partir dos seus componentes.
   * @private
   */
  private buildCounterString(
    counter: string,
    counterTypes: number[],
    counterLengths: number[],
    counterConstants: string[],
    totalComponents: number,
    chrono: number,
    typ: number,
    date: Date,
    company: string,
    site: string,
    complement: string,
  ): string {
    let valeur = '';

    for (let i = 0; i < totalComponents; i++) {
      const postTyp = counterTypes[i] || 0;
      const postLng = counterLengths[i] || 0;

      if (postTyp === 0) {
        break;
      }

      switch (postTyp) {
        case LocalMenus.SequenceNumberFields.CONSTANT:
          valeur += counterConstants[i] || '';
          break;
        case LocalMenus.SequenceNumberFields.YEAR:
          valeur += this.formatYear(postLng, date);
          break;
        case LocalMenus.SequenceNumberFields.MONTH:
          valeur += this.formatMonth(postLng, date);
          break;
        case LocalMenus.SequenceNumberFields.WEEK:
          valeur += this.getWeek(date).toString().padStart(2, '0');
          break;
        case LocalMenus.SequenceNumberFields.DAY:
          valeur += this.formatDay(postLng, date);
          break;
        case LocalMenus.SequenceNumberFields.COMPANY:
          valeur += this.formatSiteOrCompany(chrono, postLng, company);
          break;
        case LocalMenus.SequenceNumberFields.SITE:
          valeur += this.formatSiteOrCompany(chrono, postLng, site);
          break;
        case LocalMenus.SequenceNumberFields.SEQUENCE_NUMBER:
          valeur += counter;
          break;
        case LocalMenus.SequenceNumberFields.COMPLEMENT:
          valeur += this.formatComplement(postLng, complement);
          break;
      }
    }

    if (typ === LocalMenus.SequenceNumberType.NUMERIC) {
      valeur = parseInt(valeur).toString();
    }

    return valeur;
  }

  /**
   * Obtém e incrementa o valor do contador no banco de dados de forma transacional e segura.
   * @returns O próximo valor do contador, já formatado com preenchimento de zeros.
   * @private
   */
  private async createNextCounter(
    tx: PrismaTransactionClient | PrismaClient,
    counterCode: string,
    site: string,
    period: number,
    complement: string,
    length: number,
  ): Promise<string> {
    const uniqueIdentifier = {
      sequenceNumber: counterCode,
      siteOrCompany: site,
      period,
      complement,
    };

    const currentRecord = await tx.sequenceNumbers.findUnique({
      where: { sequenceNumber_siteOrCompany_period_complement: uniqueIdentifier },
    });

    const currentValue = currentRecord ? Number(currentRecord.sequenceValue) : 1;
    const nextValue = currentValue + 1;
    const timestamps = getAuditTimestamps();

    await tx.sequenceNumbers.upsert({
      where: { sequenceNumber_siteOrCompany_period_complement: uniqueIdentifier },
      update: {
        sequenceValue: nextValue,
        updateDatetime: timestamps.dateTime,
      },
      create: {
        sequenceNumber: counterCode,
        siteOrCompany: site,
        period,
        complement,
        sequenceValue: nextValue,
        createDatetime: timestamps.dateTime,
        updateDatetime: timestamps.dateTime,
        singleID: generateUUIDBuffer(),
      },
    });

    // if (currentRecord) {
    //   await tx.sequenceNumbers.update({
    //     where: { sequenceNumber_siteOrCompany_period_complement: uniqueIdentifier },
    //     data: {
    //       sequenceValue: nextValue,
    //       updateDatetime: getAuditTimestamps().dateTime,
    //     },
    //   });
    // } else {
    //   await tx.sequenceNumbers.create({
    //     data: {
    //       ...uniqueIdentifier,
    //       sequenceValue: nextValue,
    //       ...getAuditTimestamps(),
    //       singleID: generateUUIDBuffer(),
    //     },
    //   });
    // }

    const formattedNext = nextValue.toString().padStart(length, '0');

    if (formattedNext.length > length) {
      // Esta exceção causará o rollback da transação
      throw new Error(
        `O próximo valor (${nextValue}) para o contador '${counterCode}' excede o comprimento máximo de ${length} dígitos.`,
      );
    }

    const formattedId = currentValue.toString().padStart(length, '0');

    return formattedId;
  }

  private determinePeriod(razLevel: number, date: Date): number {
    switch (razLevel) {
      case LocalMenus.ResetSequenceNumberToZero.NO_RTZ:
        return 0;
      case LocalMenus.ResetSequenceNumberToZero.ANNUAL:
        return date.getFullYear() % 100;
      case LocalMenus.ResetSequenceNumberToZero.MONTHLY:
        return 100 * (date.getFullYear() % 100) + (date.getMonth() + 1);
      case 99:
        return date.getFullYear() % 10;
      default:
        return 0;
    }
  }

  private async determineSiteOrSociety(
    tx: PrismaTransactionClient | PrismaClient,
    defLevel: number,
    company: string,
    site: string,
  ): Promise<string> {
    switch (defLevel) {
      case LocalMenus.DefinitionLevel.FOLDER:
        return '';
      case LocalMenus.DefinitionLevel.COMPANY:
        const result = await tx.site.findUnique({ where: { siteCode: site }, select: { legalCompany: true } });
        if (result) {
          const found = await tx.company.findUnique({ where: { company: result.legalCompany } });
          if (found) return result.legalCompany;
        }
        return company;
      case LocalMenus.DefinitionLevel.SITE:
        return site;
      default:
        return '';
    }
  }

  private formatComplement(posLng: number, complement: string): string {
    return posLng > 0 ? complement.substring(0, posLng) : complement;
  }

  private formatSiteOrCompany(ctlchr: number, posLng: number, siteOrSociety: string): string {
    if (siteOrSociety.length < posLng && ctlchr === 2) {
      return siteOrSociety.padEnd(posLng, '_');
    }
    return siteOrSociety.substring(0, posLng);
  }

  private formatYear(index: number, date: Date): string {
    switch (index) {
      case 1:
        return this.determinePeriod(99, date).toString();
      case 2:
        return this.determinePeriod(LocalMenus.ResetSequenceNumberToZero.ANNUAL, date).toString().padStart(2, '0');
      case 4:
        return date.getFullYear().toString();
      default:
        return '';
    }
  }

  private formatMonth(index: number, date: Date): string {
    if (index === 2) return (date.getMonth() + 1).toString().padStart(2, '0');
    if (index === 3) return date.toLocaleString('default', { month: 'short' }).toUpperCase();
    return '';
  }

  private formatDay(index: number, date: Date): string {
    if (index === 1) return date.getDay().toString().padStart(2, '0');
    if (index === 2) return date.getDate().toString().padStart(2, '0');
    if (index === 3) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(diff / oneDay);
      return dayOfYear.toString().padStart(3, '0');
    }
    return '';
  }

  /**
   * Calcula o número da semana do ano para uma data.
   * @private
   */
  private getWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}
