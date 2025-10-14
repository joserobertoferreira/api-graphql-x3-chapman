import { Prisma } from '@prisma/client';
import { CreateCustomerInput } from '../../modules/customers/dto/create-customer.input';
import { CustomerEntity } from '../../modules/customers/entities/customer.entity';
import { CreateSupplierInput } from '../../modules/suppliers/dto/create-supplier.input';
import { SupplierEntity } from '../../modules/suppliers/entities/supplier.entity';

// Types

/**
 * Type representing a customer with relations to build a payload that includes related entities.
 */
export type CustomerWithRelations = Prisma.CustomerGetPayload<{
  include: typeof customerInclude;
}>;

/**
 * Type representing the response of a customer operation, including both the entity and the raw data.
 */
export type CustomerResponse = {
  entity: CustomerEntity;
  raw: CustomerWithRelations;
};

/**
 * Return type for building a customer context.
 */
export type ReturnCustomerBuildContext = {
  context: ValidatedCustomerContext;
  updatedInput: CreateCustomerInput;
};

/**
 * Type representing the payloads required to create a new customer and its related entities.
 */
export type CustomerCreationPayloads = {
  businessPartner: Prisma.BusinessPartnerUncheckedCreateInput;
  customer: Prisma.CustomerUncheckedCreateInput;
  address: Prisma.AddressUncheckedCreateInput;
  shipToAddress: Prisma.ShipToCustomerUncheckedCreateInput;
};

/**
 * Type representing a supplier with relations to build a payload that includes related entities.
 */
export type SupplierWithRelations = Prisma.SupplierGetPayload<{
  include: typeof supplierInclude;
}>;

/**
 * Type representing the response of a supplier operation, including both the entity and the raw data.
 */
export type SupplierResponse = {
  entity: SupplierEntity;
  raw: SupplierWithRelations;
};

/**
 * Return type for building a supplier context.
 */
export type ReturnSupplierBuildContext = {
  context: ValidatedSupplierContext;
  updatedInput: CreateSupplierInput;
};

/**
 * Type representing the payloads required to create a new supplier and its related entities.
 */
export type SupplierCreationPayloads = {
  businessPartner: Prisma.BusinessPartnerUncheckedCreateInput;
  supplier: Prisma.SupplierUncheckedCreateInput;
  address: Prisma.AddressUncheckedCreateInput;
};

// Interfaces

/**
 * Interface definition for validated customer context.
 */
export interface ValidatedCustomerContext {
  category: Prisma.CustomerCategoryGetPayload<{}>;
}

/**
 * Interface definition for customer number.
 */
export interface CustomerSequenceNumber {
  sequence: string;
  legislation: string;
  company: string;
  site: string;
  date: Date;
  complement: string;
}

/**
 * Interface definition for validated supplier context.
 */
export interface ValidatedSupplierContext {
  category: Prisma.SupplierCategoryGetPayload<{}>;
}

/**
 * Interface definition for supplier number.
 */
export interface SupplierSequenceNumber {
  sequence: string;
  legislation: string;
  company: string;
  site: string;
  date: Date;
  complement: string;
}

// Constants
export const customerInclude = Prisma.validator<Prisma.CustomerInclude>()({
  addresses: true,
});

export const supplierInclude = Prisma.validator<Prisma.SupplierInclude>()({
  addresses: true,
});
