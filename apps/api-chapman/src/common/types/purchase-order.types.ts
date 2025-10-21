import { Prisma } from 'src/generated/prisma';
import { BaseValidateDimensionContext } from '../../modules/dimensions/strategies/dimension-strategy.interface';
import {
  CreatePurchaseOrderInput,
  PurchaseOrderLineInput,
} from '../../modules/purchase-order/dto/create-purchase-order.input';
import { DimensionsInput } from '../inputs/dimension.input';
import { IntersiteContext } from './business-partner.types';
import { Ledgers } from './common.types';
import { DimensionTypeConfig } from './dimension.types';

// Types

/**
 * Type definition for purchase order dimensions.
 */
export type PurchaseOrderDimensionDetail = {
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
 * Return type for building a purchase order context.
 */
export type ReturnPurchaseOrderBuildContext = {
  context: ValidatedPurchaseOrderContext;
  updatedInput: CreatePurchaseOrderInput;
  intersiteContext: IntersiteContext;
};

/**
 * Combined type for PurchaseOrder with its lines.
 */
export type PurchaseOrderWithLines = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderFullInclude;
}>;

/**
 * Define a type for cross-site purchase orders, including intersite context.
 */
export type CrossSitePurchaseOrder = PurchaseOrderWithLines & {
  intersiteContext: IntersiteContext;
};

/**
 * Define a type for updated sales orders with linked purchase orders.
 *
 */
export type UpdatedSalesOrderLinkedWithPurchaseOrder = {
  orderNumber: string;
  purchaseOrder: PurchaseOrderWithLines;
};

// Interfaces

/**
 * Interface definition for purchase order number.
 */
export interface PurchaseOrderSequenceNumber {
  legislation: string;
  company: string;
  purchaseSite: string;
  orderDate: Date;
  complement: string;
}

/**
 * Interface definition for a purchase order line with details.
 */
export interface PurchaseOrderLineContext extends Omit<PurchaseOrderLineInput, 'dimensions'> {
  lineNumber: number;
  dimensions: DimensionsInput;
}

/**
 * Specific context for validating dimensions within a Sales Order.
 * It EXTENDS the base context with order-specific information.
 */
export interface PurchaseOrderDimensionContext extends BaseValidateDimensionContext {
  line: PurchaseOrderLineInput;
  lineNumber: number;
}

/**
 * Interface definition for a validated purchase order context.
 */
export interface ValidatedPurchaseOrderContext {
  supplier: Prisma.SupplierGetPayload<{ include: { addresses: true; businessPartner: true } }>;
  site: Prisma.SiteGetPayload<{ include: { company: true } }>;
  ledgers: Ledgers;
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  currency: string;
  taxRule: string;
  lines: PurchaseOrderLineContext[];
}

/**
 * Interface definition for product validation within a purchase order.
 */
export interface ValidatePurchaseOrderLineProductContext {
  taxLevelCode: string;
}

// Constants

export const purchaseOrderFullInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  orderLines: {
    include: {
      price: true,
    },
  },
  orderPrices: {
    include: {
      analyticalAccountingLines: true,
    },
  },
  orderFooter: true,
});
