import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { BaseResolver } from 'src/common/resolvers/base.resolver';
import { IDataloaders } from 'src/dataloader/dataloader.service';
import { CreateSupplierInvoiceInput } from './dto/create-supplier-invoice.input';
import { SupplierInvoiceFilterInput } from './dto/filter-supplier-invoice.input';
import { SupplierInvoiceConnection } from './entities/supplier-invoice-connection.entity';
import {
  SupplierInvoiceAnalyticalLineEntity,
  SupplierInvoiceLineEntity,
} from './entities/supplier-invoice-line.entity';
import { SupplierInvoiceEntity } from './entities/supplier-invoice.entity';
import { mapAnalyticalLineToEntity, mapLineToEntity } from './helpers/supplier-invoice.mapper';
import { SupplierInvoiceService } from './supplier-invoice.service';

@Resolver(() => SupplierInvoiceEntity)
export class SupplierInvoiceResolver extends BaseResolver {
  constructor(private readonly supplierInvoiceService: SupplierInvoiceService) {
    super();
  }

  @Mutation(() => SupplierInvoiceEntity, { name: 'createSupplierInvoice' })
  createSupplierInvoice(@Args('input') input: CreateSupplierInvoiceInput) {
    return this.supplierInvoiceService.create(input);
  }

  @Query(() => SupplierInvoiceConnection, { name: 'getSupplierInvoices' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => SupplierInvoiceFilterInput, nullable: true })
    filter?: SupplierInvoiceFilterInput,
  ) {
    return this.supplierInvoiceService.findPaginated(paginationArgs, filter);
  }

  @Query(() => SupplierInvoiceEntity, { name: 'getSupplierInvoice' })
  findOne(@Args('invoiceNumber') invoiceNumber: string) {
    return this.supplierInvoiceService.findOne(invoiceNumber);
  }

  @ResolveField('lines', () => [SupplierInvoiceLineEntity], { nullable: 'itemsAndList' })
  async getLines(
    @Parent() invoice: SupplierInvoiceEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<SupplierInvoiceLineEntity[]> {
    if (!loaders.supplierInvoiceLinesByDocumentLoader) {
      throw new Error('supplierInvoiceLinesByDocumentLoader is not defined in loaders');
    }
    const lineModels = await loaders.supplierInvoiceLinesByDocumentLoader.load(invoice.invoiceNumber);

    return lineModels.map((line) => mapLineToEntity(line));
  }
}

@Resolver(() => SupplierInvoiceLineEntity)
export class SupplierInvoiceLineResolver extends BaseResolver {
  @ResolveField('analyticalLines', () => [SupplierInvoiceAnalyticalLineEntity], { nullable: 'itemsAndList' })
  async getAnalyticalLines(
    @Parent() line: SupplierInvoiceLineEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<SupplierInvoiceAnalyticalLineEntity[]> {
    if (!loaders.supplierAnalyticalLinesByDocumentLineLoader || !line.document || line.lineNumber === undefined) {
      return [];
    }
    const rows = await loaders.supplierAnalyticalLinesByDocumentLineLoader.load({
      document: line.document,
      line: line.lineNumber,
    });

    return rows.map((row) => mapAnalyticalLineToEntity(row));
  }
}
