import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';

// Interfaces

/**
 * Interface definition for an open item.
 */
export interface OpenItemContext {
  documentType?: string;
  documentNumber?: string;
  lineNumber?: number;
  openItemLineNumber?: number;
  journalEntryLineInternalNumber?: number;
  company?: string;
  site?: string;
  currency?: string;
  controlAccount?: string;
  businessPartner?: string;
  businessPartnerType?: number;
  payToOrPayByBusinessPartner?: string;
  businessPartnerAddress?: string;
  dueDate?: Date;
  paymentMethod?: string;
  paymentType?: number;
  sign?: number;
  amountInCurrency?: Decimal;
  amountInCompanyCurrency?: Decimal;
  canBeReminded?: number;
  paymentApprovalLevel?: number;
  postedStatus?: number;
  fiscalYear?: number;
  period?: number;
  closedStatus?: number;
  typeOfOpenItem?: number;
  uniqueNumber?: string;
}

// Types

/**
 * Type definition for business partner info
 */
export type OpenItemBusinessPartnerInfo = {
  code?: string;
  partnerType?: number;
  partnerAddress?: string;
  payToOrPayBy?: string;
  paymentMethod?: string;
  paymentType?: number;
};

/**
 * Type definition for header context used in open item creation
 */
export type OpenItemCreate = {
  openItem: Prisma.OpenItemCreateInput[];
  archive: Prisma.OpenItemArchiveCreateInput[];
};
