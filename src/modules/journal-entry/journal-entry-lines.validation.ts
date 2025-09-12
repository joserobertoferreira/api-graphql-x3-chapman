import { BadRequestException } from '@nestjs/common';
import { CommonService } from '../../common/services/common.service';
import { JournalEntryLedgerWithPlanAndAccounts, JournalEntryLineContext } from '../../common/types/journal-entry.types';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { JournalEntryLineInput } from './dto/journal-entry-line.input';

/**
 * Validate journal entry lines.
 * This function checks each line of a journal entry to ensure that:
 */
export async function validateLines(
  lines: JournalEntryLineInput[],
  company: string,
  fiscalYear: number,
  period: number | null,
  ledgerMap: JournalEntryLedgerWithPlanAndAccounts[],
  commonService: CommonService,
  businessPartnerService: BusinessPartnerService,
): Promise<JournalEntryLineContext[] | null> {
  const contextLines: JournalEntryLineContext[] = [];

  // Build an array of promises for line validations
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;

    // Execute validations asynchronously for each ledger
    for (const [ledgerIndex, data] of ledgerMap.entries()) {
      const ledgerType = ledgerIndex + 1;

      // Check if the ledger exists
      if (!data.ledgerCode) {
        continue; // Skip if ledger data is not available
      }

      // Get account data for the line and check if the account exists in the plan code
      const account = data.accounts.find((acc) => acc.account === line.account);
      if (!account) {
        throw new BadRequestException(
          `Line #${index + 1}: Ledger [${data.ledgerCode}] Account code "${line.account}" is not valid for company "${company}".`,
        );
      }

      const legislation = data.ledger?.legislation || '';

      // Check if the business partner requirement is met
      if (account.collective === LocalMenus.NoYes.YES) {
        if (!line.businessPartner || line.businessPartner.trim() === '') {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Business Partner is required for account code "${line.account}".`,
          );
        }

        // Verify if the business partner exists
        const bp = await businessPartnerService.businessPartnerExists(line.businessPartner);
        if (!bp) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Business Partner "${line.businessPartner}" not found.`,
          );
        }
      } else if (line.businessPartner && line.businessPartner.trim() !== '') {
        line.businessPartner = ''; // Clear business partner if not required
      }

      // Check if is mandatory to inform tax management
      if (account.taxManagement > LocalMenus.TaxManagement.NOT_SUBJECTED) {
        if (!line.taxCode || line.taxCode.trim() === '') {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Tax is required for account code "${line.account}".`,
          );
        }

        // Check if the informed tax code is valid
        const taxCodeValid = await commonService.taxCodeExists(line.taxCode, legislation);
        if (!taxCodeValid) {
          throw new BadRequestException(
            `Line #${index + 1}: Ledger [${data.ledgerCode}] Tax code "${line.taxCode}" is not valid for legislation "${legislation}".`,
          );
        }
      } else if (line.taxCode && line.taxCode.trim() !== '') {
        line.taxCode = ''; // Clear tax code if not required
      }

      // If all validations pass, add the line to the context lines
      contextLines.push({ ...line, lineNumber, ledgerType, fiscalYear, period, account });
    }
  }
  return contextLines;
}
