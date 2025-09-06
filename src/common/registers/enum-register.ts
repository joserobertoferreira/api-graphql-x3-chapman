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
