import { Prisma } from '@prisma/client';
import { BaseValidateDimensionContext } from '../../modules/dimensions/strategies/dimension-strategy.interface';
import { CreateSalesOrderInput, SalesOrderLineInput } from '../../modules/sales-order/dto/create-sales-order.input';
import { DimensionsInput } from '../inputs/dimension.input';
import { Ledgers } from './common.types';
import { DimensionTypeConfig } from './dimension.types';

// Types

/**
 * Type definition for sales order dimensions.
 */
export type SalesOrderDimensionDetail = {
  dimensionType: string;
  dimension: string;
  additionalInfo?: string;
  shortTitle?: string;
  pioneerReference?: string;
  fixtureCustomer?: {
    code: string;
    name: string;
  };
  brokerEmail?: string;
};

/**
 * Return type for building a sales order context.
 */
export type ReturnSalesOrderBuildContext = {
  context: ValidatedSalesOrderContext;
  updatedInput: CreateSalesOrderInput;
};

// Interfaces

/**
 * Interface definition for sales order number.
 */
export interface SalesOrderSequenceNumber {
  orderType: string;
  legislation: string;
  company: string;
  salesSite: string;
  orderDate: Date;
  complement: string;
}

/**
 * Interface definition for a sales order line with details.
 */
export interface SalesOrderLineContext extends Omit<SalesOrderLineInput, 'dimensions'> {
  lineNumber: number;
  dimensions: DimensionsInput;
}

/**
 * Specific context for validating dimensions within a Sales Order.
 * It EXTENDS the base context with order-specific information.
 */
export interface SalesOrderDimensionContext extends BaseValidateDimensionContext {
  line: SalesOrderLineInput;
  lineNumber: number;
}

/**
 * Interface definition for a validated sales order context.
 */
export interface ValidatedSalesOrderContext {
  customer: Prisma.CustomerGetPayload<{ include: { addresses: true; businessPartner: true } }>;
  site: Prisma.SiteGetPayload<{ include: { company: true } }>;
  ledgers: Ledgers;
  salesOrderType: Prisma.SalesOrderTypeGetPayload<{}>;
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  currency: string;
  taxRule: string;
  lines: SalesOrderLineContext[];
}

/**
 * Interface definition for product validation within a sales order.
 */
export interface ValidateSalesOrderLineProductContext {
  taxLevelCode: string;
}
