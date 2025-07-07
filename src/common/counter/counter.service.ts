import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_LEGACY_DATE } from '../types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../utils/audit-date.utils';
import { LocalMenus } from '../utils/enums/local-menu';

@Injectable()
export class CounterService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém o próximo número de documento formatado de acordo com uma definição de contador.
   * @param counterCode O código da sequência do contador (ex: 'VENDA_NF').
   * @param site O site ou sociedade associado ao contador (opcional).
   * @param date A data de referência para o contador (opcional, padrão é a data atual).
   * @param comp Um complemento opcional para o contador.
   * @returns A string formatada do próximo número do contador.
   * @throws NotFoundException se a definição do contador não for encontrada.
   * @throws Error se ocorrer um erro na geração do número.
   */
  public async getNextCounter(
    counterCode: string,
    site: string = '',
    date: Date = DEFAULT_LEGACY_DATE,
    comp: string = '',
  ): Promise<string> {
    // Attempts to get the counter definition
    const counterData = await this.prisma.documentNumbers.findUnique({
      where: { sequenceCode: counterCode },
    });

    if (!counterData) {
      throw new NotFoundException(`Definição do contador '${counterCode}' não encontrada.`);
    }

    // Transform the componentType, componentLength and constants into arrays for easier access
    const componentTypes: number[] = [];
    const componentLengths: number[] = [];
    const constants: string[] = [];

    for (let i = 1; i <= 10; i++) {
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

    const lengthOfSequence: number = componentLengths[index] || 1;

    if (componentTypes.indexOf(9) !== -1) {
      comp = '';
    }

    let finalCounter = '';

    try {
      const period = this.determinePeriod(counterData.rtzLevel, date);
      const siteOrSociety = this.determineSiteOrSociety(counterData.definitionLevel, site);
      const counter = await this.createNextCounter(counterCode, siteOrSociety, period, comp, lengthOfSequence);

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
          siteOrSociety,
          comp,
        );
      }
    } catch (e) {
      console.error(`Erro ao obter próximo editor_id: ${e}`);
      throw e;
    }

    return finalCounter;
  }
  catch(e) {
    console.error(`Erro ao obter código do contador: ${e}`);
    return '';
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
        case LocalMenus.Chapter47.CONSTANT:
          valeur += counterConstants[i] || '';
          break;
        case LocalMenus.Chapter47.YEAR:
          valeur += this.formatYear(postLng, date);
          break;
        case LocalMenus.Chapter47.MONTH:
          valeur += this.formatMonth(postLng, date);
          break;
        case LocalMenus.Chapter47.WEEK:
          valeur += this.getWeek(date).toString().padStart(2, '0');
          break;
        case LocalMenus.Chapter47.DAY:
          valeur += this.formatDay(postLng, date);
          break;
        case LocalMenus.Chapter47.COMPANY:
        case LocalMenus.Chapter47.SITE:
          valeur += this.formatSiteOrCompany(chrono, postLng, site);
          break;
        case LocalMenus.Chapter47.SEQUENCE_NUMBER:
          valeur += counter;
          break;
        case LocalMenus.Chapter47.COMPLEMENT:
          valeur += this.formatComplement(postLng, complement);
          break;
      }
    }

    if (typ === LocalMenus.Chapter46.NUMERIC) {
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
    counterCode: string,
    site: string,
    period: number,
    complement: string,
    length: number,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const uniqueIdentifier = {
          sequenceNumber: counterCode,
          siteOrCompany: site,
          period,
          complement,
        };

        const currentRecord = await tx.sequenceNumbers.findUnique({
          where: { sequenceNumber_siteOrCompany_period_complement: uniqueIdentifier },
        });

        const currentValue = currentRecord ? Number(currentRecord.sequenceValue) : 0;
        const nextValue = currentValue + 1;

        if (currentRecord) {
          await tx.sequenceNumbers.update({
            where: { sequenceNumber_siteOrCompany_period_complement: uniqueIdentifier },
            data: {
              sequenceValue: nextValue,
              updateDatetime: getAuditTimestamps().dateTime,
            },
          });
        } else {
          await tx.sequenceNumbers.create({
            data: {
              ...uniqueIdentifier,
              sequenceValue: nextValue,
              ...getAuditTimestamps(),
              singleID: generateUUIDBuffer(),
            },
          });
        }

        const formattedId = nextValue.toString().padStart(length, '0');

        if (formattedId.length > length) {
          // Esta exceção causará o rollback da transação
          throw new Error(
            `O próximo valor (${nextValue}) para o contador '${counterCode}' excede o comprimento máximo de ${length} dígitos.`,
          );
        }
        return formattedId;
      },
      {
        // Nível de isolamento crucial para alta concorrência e evitar race conditions
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000, // 5 segundos
        timeout: 10000, // 10 segundos
      },
    );
  }

  private determinePeriod(razLevel: number, date: Date): number {
    switch (razLevel) {
      case LocalMenus.Chapter48.NO_RTZ:
        return 0;
      case LocalMenus.Chapter48.ANNUAL:
        return date.getFullYear() % 100;
      case LocalMenus.Chapter48.MONTHLY:
        return 100 * (date.getFullYear() % 100) + (date.getMonth() + 1);
      case 99:
        return date.getFullYear() % 10;
      default:
        return 0;
    }
  }

  private determineSiteOrSociety(defLevel: number, site: string): string {
    switch (defLevel) {
      case LocalMenus.Chapter45.FOLDER:
        return '';
      case LocalMenus.Chapter45.COMPANY:
        return ''; // TODO: Implementar lógica de empresa, se necessário
      case LocalMenus.Chapter45.SITE:
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
        return this.determinePeriod(LocalMenus.Chapter48.ANNUAL, date).toString().padStart(2, '0');
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
