import { registerEnumType } from '@nestjs/graphql';

export enum NoYesGQL {
  no = 'no',
  yes = 'yes',
}

registerEnumType(NoYesGQL, {
  name: 'NoYes',
  description: 'Indicates a binary choice between No and Yes.',
});

export enum ExchangeRateTypeGQL {
  dailyRate = 'dailyRate',
  monthlyRate = 'monthlyRate',
  averageRate = 'averageRate',
  customsDocFileExchange = 'customsDocFileExchange',
}

registerEnumType(ExchangeRateTypeGQL, {
  name: 'ExchangeRateType',
  description: 'The different types of currency exchange rates.',
});

export enum OrderStatusGQL {
  open = 'open',
  closed = 'closed',
}

registerEnumType(OrderStatusGQL, {
  name: 'OrderStatus',
  description: 'The status of an order, either open or closed.',
});

export enum LineStatusGQL {
  pending = 'pending',
  late = 'late',
  closed = 'closed',
}

registerEnumType(LineStatusGQL, {
  name: 'LineStatus',
  description: 'The status of a line item, such as pending, late, or closed.',
});

export enum InvoiceStatusGQL {
  notInvoiced = 'notInvoiced',
  partiallyInvoiced = 'partiallyInvoiced',
  invoiced = 'invoiced',
}

registerEnumType(InvoiceStatusGQL, {
  name: 'InvoiceStatus',
  description: 'The invoicing status of an order.',
});

export enum InvoiceTypeGQL {
  invoice = 'invoice',
  creditNote = 'creditNote',
  debitNote = 'debitNote',
  creditMemo = 'creditMemo',
  proforma = 'proforma',
}

registerEnumType(InvoiceTypeGQL, {
  name: 'InvoiceType',
  description: 'The type of invoice, such as standard, credit note, or debit note.',
});

export enum InvoiceAccountingStatusGQL {
  notPosted = 'notPosted',
  notUsed = 'notUsed',
  posted = 'posted',
}

registerEnumType(InvoiceAccountingStatusGQL, {
  name: 'InvoiceAccountingStatus',
  description: 'The accounting status of an invoice.',
});

export enum EntityTypeGQL {
  businessPartner = 'businessPartner',
  company = 'company',
  site = 'site',
  user = 'user',
  accounts = 'accounts',
  leads = 'leads',
  building = 'building',
  place = 'place',
}

registerEnumType(EntityTypeGQL, {
  name: 'EntityType',
  description: 'The type of entity, such as business partner, company, or user.',
});

export enum PaymentApprovalTypeGQL {
  // X3 local menu 510

  notApproved = 'notApproved',
  conflict = 'conflict',
  delayed = 'delayed',
  authorizedToPay = 'authorizedToPay',
}

registerEnumType(PaymentApprovalTypeGQL, {
  name: 'PaymentApprovalType',
  description: 'The payment approval type.',
});

export enum PurchaseInvoiceTypeGQL {
  // X3 local menu 533

  invoice = 'invoice',
  complementInvoice = 'complementInvoice',
  creditNote = 'creditNote',
  creditNoteReturn = 'creditNoteReturn',
}

registerEnumType(PurchaseInvoiceTypeGQL, {
  name: 'PurchaseInvoiceType',
  description: 'The type of purchase invoice.',
});

export enum TaxManagementGQL {
  // X3 local menu 608

  notSubjected = 'notSubjected',
  subjected = 'subjected',
  taxAccount = 'taxAccount',
  eecTax = 'eecTax',
  downPaymentAccount = 'downPaymentAccount',
}

registerEnumType(TaxManagementGQL, {
  name: 'TaxManagement',
  description: 'The tax management type.',
});

export enum SignByDefaultGQL {
  // X3 local menu 610

  debit = 'debit',
  credit = 'credit',
  unspecified = 'unspecified',
}

registerEnumType(SignByDefaultGQL, {
  name: 'SignByDefault',
  description: 'The sign by default type.',
});

export enum AccountingJournalStatusGQL {
  // X3 local menu 617

  temporary = 'temporary',
  final = 'final',
}

registerEnumType(AccountingJournalStatusGQL, {
  name: 'AccountingJournalStatus',
  description: 'The accounting journal status.',
});

export enum AccountingJournalCategoryGQL {
  // X3 local menu 618

  actual = 'actual',
  activeSimulation = 'activeSimulation',
  inactiveSimulation = 'inactiveSimulation',
  exceptional = 'exceptional',
  template = 'template',
}

registerEnumType(AccountingJournalCategoryGQL, {
  name: 'AccountingJournalCategory',
  description: 'The category of accounting journal entries.',
});

export enum RateDateGQL {
  // X3 local menu 917

  journalEntryDate = 'journalEntryDate',
  sourceDocumentDate = 'sourceDocumentDate',
}

registerEnumType(RateDateGQL, {
  name: 'RateDate',
  description: 'The date type for exchange rates.',
});

export enum DueDateItemTypeGQL {
  // X3 local menu 2614

  order = 'order',
  invoice = 'invoice',
  payment = 'payment',
  others = 'others',
}

registerEnumType(DueDateItemTypeGQL, {
  name: 'DueDateItemType',
  description: 'The type of due date item.',
});

export enum LedgerTypeGQL {
  // X3 local menu 2644

  legal = 'legal',
  analytical = 'analytical',
  ias = 'ias',
  cfConsolidationGBP = 'cfConsolidationGBP',
  cfConsolidationUSD = 'cfConsolidationUSD',
  cfConsolidationLedger = 'cfConsolidationLedger',
  notUsed7 = 'notUsed7',
  notUsed8 = 'notUsed8',
  notUsed9 = 'notUsed9',
  notUsed10 = 'notUsed10',
}

registerEnumType(LedgerTypeGQL, {
  name: 'LedgerType',
  description: 'The type of ledger.',
});

export enum EntryOriginGQL {
  // X3 local menu 2801

  directEntry = 'directEntry',
  automaticLoading = 'automaticLoading',
  import = 'import',
}

registerEnumType(EntryOriginGQL, {
  name: 'EntryOrigin',
  description: 'The origin of the entry.',
});
