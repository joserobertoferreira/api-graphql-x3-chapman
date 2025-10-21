import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AccountingModel, Accounts, DocumentTypes, Ledger, Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { FindAutomaticJournalArgs, LedgerPlanCode, Ledgers } from '../types/common.types';
import { JournalEntryLedger } from '../types/journal-entry.types';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if an account exists in the database.
   * @param chart - The chart of accounts identifier.
   * @param account - The account identifier to check.
   * @returns The account record if found, otherwise null.
   */
  async getAccount(chart: string, account: string): Promise<Accounts | null> {
    const accountRecord = await this.prisma.accounts.findUnique({
      where: { planCode_account: { planCode: chart, account: account } },
    });
    return accountRecord;
  }

  /**
   * Check if multiple accounts exist in the database.
   * @param chart - The chart of accounts identifier.
   * @param accountCodes - An array of account identifiers to check.
   * @returns An array of account records that were found.
   */
  async getAccounts(chart: string, accountCodes: string[]): Promise<Accounts[]> {
    const accounts = await this.prisma.accounts.findMany({
      where: {
        planCode: chart,
        account: { in: accountCodes },
      },
    });
    return accounts;
  }

  /**
   * Check if a document type exist in the database.
   * @param code - The document type code to check.
   * @param legislation - The legislation to filter by.
   * @returns An object with the document type code if found, otherwise null.
   */
  async getDocumentType(code: string, legislation: string): Promise<DocumentTypes | null> {
    const docType = await this.prisma.documentTypes.findUnique({
      where: { documentType_legislation: { documentType: code, legislation } },
    });
    return docType;
  }

  /**
   * Get the ledger data for a given ledger code.
   * @param ledgerCode - The ledger code to look up.
   * @returns The ledger object if found, otherwise null.
   */
  async getLedger(ledgerCode: string): Promise<Ledger | null> {
    const ledger = await this.prisma.ledger.findUnique({
      where: { code: ledgerCode },
    });
    return ledger;
  }

  /**
   * Read an array of ledgers code and return another array with the ledgers objects.
   * The order of the ledgers in the output array must be the same as in the input array.
   * @param ledgerCodes - An array of ledger codes to fetch.
   * @returns An array of ledger objects corresponding to the input codes.
   */
  async getJournalEntryLedgers(ledgerCodes: string[]): Promise<JournalEntryLedger[]> {
    const codesToFetch = [
      ...new Set(ledgerCodes.filter((code) => code && typeof code === 'string' && code.trim() !== '')),
    ];

    // If no valid ledger codes, return empty array mapped with nulls
    if (codesToFetch.length === 0) {
      return ledgerCodes.map((code) => ({
        ledger: code,
        data: null,
      }));
    }

    // Fetch ledgers from the database using batch query
    const ledgers = await this.prisma.ledger.findMany({
      where: { code: { in: codesToFetch } },
    });

    // Map the fetched ledgers to quick lookup
    const lookupMap = new Map<string, Ledger>(ledgers.map((ledger) => [ledger.code, ledger]));

    // Map the fetched ledgers to the input order
    const ledgersMap = ledgerCodes.map((ledgerCode) => {
      const ledger = lookupMap.get(ledgerCode?.trim()) || null;

      return { ledger: ledgerCode, data: ledger };
    });

    return ledgersMap;
  }

  /**
   * Get the accounting model for a given company accounting model code.
   * @param accountingModel - The accounting model code to look up.
   * @returns The accounting model code if found, otherwise null.
   */
  async getAccountingModel(accountingModel: string): Promise<AccountingModel | null> {
    const model = await this.prisma.accountingModel.findUnique({
      where: { accountingModel },
    });

    return model;
  }

  /**
   * Return the ledger data for the given accounting model
   * @param accountingModel Accounting model code
   * @returns List with the ledger data or an empty list if not found.
   */
  async getLedgers(accountingModel: string): Promise<Ledgers> {
    try {
      const result = await this.prisma.accountingModel.findUnique({
        where: { accountingModel },
        select: {
          ledger1: true,
          ledger2: true,
          ledger3: true,
          ledger4: true,
          ledger5: true,
          ledger6: true,
          ledger7: true,
          ledger8: true,
          ledger9: true,
          ledger10: true,
        },
      });

      if (!result) {
        throw new NotFoundException(`Ledgers for Accounting model "${accountingModel}" not found.`);
      }

      const ledgersArray = Object.values(result).filter(Boolean) as string[];

      return {
        ledgers: ledgersArray,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Erro ao buscar ledgers para o modelo contabilístico "${accountingModel}":`, error);
      throw new InternalServerErrorException('Could not fetch ledger data.');
    }
  }

  /**
   * Return the plan code for the given ledger
   * @param ledger Ledger code
   * @returns The plan code or null if not found.
   */
  async getPlanCode(ledger: string): Promise<string> {
    try {
      const result = await this.prisma.ledger.findUnique({
        where: { code: ledger },
        select: { planCode: true },
      });

      if (!result) {
        throw new NotFoundException(`Plan code for ledger "${ledger}" not found.`);
      }

      return result.planCode;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(`Erro ao buscar o plano de contas para o referencial "${ledger}":`, error);
      throw new InternalServerErrorException('Could not read plan code.');
    }
  }

  /**
   * Return a list of plan codes for the given list of ledgers
   * @param ledgers Array of ledgers codes
   * @returns A promise that resolves to an array of plan codes.
   */
  async getPlanCodes(ledgers: Ledgers): Promise<LedgerPlanCode[]> {
    const ledgerCodes = ledgers.ledgers;

    if (!ledgerCodes || ledgerCodes.length === 0) return [];

    try {
      const results = await this.prisma.ledger.findMany({
        where: { code: { in: ledgerCodes } },
        select: { code: true, planCode: true },
      });

      return results;
    } catch (error) {
      console.error('Erro ao buscar planos de contas dos referenciais:', error);
      throw new InternalServerErrorException('Error to fetch plan codes.');
    }
  }

  /**
   * Get the automatic journal from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an array of results with the shape defined by select or include.
   */
  async getAutomaticJournals<T extends FindAutomaticJournalArgs>(
    args: T,
  ): Promise<Prisma.AutomaticJournalGetPayload<T>[]> {
    try {
      const result = await this.prisma.automaticJournal.findMany(args);
      return result as Prisma.AutomaticJournalGetPayload<T>[];
    } catch (error) {
      console.error('Erro ao buscar lançamentos automáticos:', error);
      throw new Error('Could not fetch automatic journals.');
    }
  }

  /**
   * Get the accounting code from the database
   * @param args Search arguments { where, orderBy, skip, take, select, include }.
   * @returns A Promise that resolves to an accounting code or null.
   */
  async getAccountingCode(args: Prisma.AccountingCodeFindUniqueArgs): Promise<AccountingModel | null> {
    try {
      const result = await this.prisma.accountingCode.findUnique(args);
      return result as AccountingModel | null;
    } catch (error) {
      console.error('Erro ao buscar códigos contabilísticos:', error);
      throw new Error('Could not fetch accounting codes.');
    }
  }
}
