import { UserInputError } from '@nestjs/apollo';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Accounts } from 'src/generated/prisma/client';
import { IntercompanyJournalEntryLineInput } from '../../intercompany-journal-entry/dto/create-intercompany-journal-entry-line.input';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

/**
 * Validates a single journal entry line against the business rules of its account.
 * (Checks for business partner, tax, and dimension type requirements).
 */
export function validateAccountRules(
  line: JournalEntryLineInput | IntercompanyJournalEntryLineInput,
  account: Accounts,
  context: {
    lineNumber: number;
    ledgerCode: string;
    legislation: string;
    businessPartners: Map<string, any>;
    taxCodes: Set<string>;
  },
): JournalEntryLineInput {
  const { lineNumber, legislation, ledgerCode, businessPartners, taxCodes } = context;

  const updatedLine = { ...line };

  // Check if the business partner requirement is met
  const collective: LocalMenus.NoYes = account.collective;

  if (collective === LocalMenus.NoYes.YES) {
    if (!updatedLine.businessPartner || updatedLine.businessPartner.trim() === '') {
      throw new UserInputError(
        `Line #${lineNumber}: Ledger [${ledgerCode}] Business Partner is required for account code ${updatedLine.account}.`,
        {
          extensions: {
            line: lineNumber,
            field: 'businessPartner',
            accountCode: updatedLine.account,
          },
        },
      );
    }

    // Verify if the business partner exists
    if (!businessPartners.has(updatedLine.businessPartner)) {
      throw new UserInputError(
        `Line #${lineNumber}: Ledger [${ledgerCode}] Business Partner ${updatedLine.businessPartner} don't exist.`,
        {
          extensions: {
            line: lineNumber,
            field: 'businessPartner',
            accountCode: updatedLine.account,
          },
        },
      );
    }
  } else if (updatedLine.businessPartner && updatedLine.businessPartner.trim() !== '') {
    updatedLine.businessPartner = ''; // Clear business partner if not required
  }

  // Check if is mandatory to inform tax management
  const taxManagement: LocalMenus.TaxManagement = account.taxManagement;

  if (taxManagement > LocalMenus.TaxManagement.NOT_SUBJECTED) {
    if (!updatedLine.taxCode || updatedLine.taxCode.trim() === '') {
      throw new UserInputError(
        `Line #${lineNumber}: Ledger [${ledgerCode}] Tax is required for account code ${updatedLine.account}.`,
        {
          extensions: {
            line: lineNumber,
            field: 'tax',
            accountCode: updatedLine.account,
          },
        },
      );
    }

    // Check if the informed tax code is valid
    if (!taxCodes.has(updatedLine.taxCode)) {
      throw new UserInputError(
        `Line #${lineNumber}: Ledger [${ledgerCode}] Tax code ${updatedLine.taxCode} doesn't exist or isn't valid for legislation ${legislation}.`,
        {
          extensions: {
            line: lineNumber,
            field: 'tax',
            accountCode: updatedLine.account,
          },
        },
      );
    }
  } else if (updatedLine.taxCode && updatedLine.taxCode.trim() !== '') {
    updatedLine.taxCode = ''; // Clear tax code if not required
  }

  return updatedLine;
}
