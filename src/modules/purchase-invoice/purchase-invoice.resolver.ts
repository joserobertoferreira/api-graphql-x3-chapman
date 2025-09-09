import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { PurchaseInvoiceFilterInput } from './dto/filter-purchase-invoice.input';
import { PurchaseInvoiceConnection } from './entities/purchase-invoice-connection.entity';
import { PurchaseInvoiceLineEntity } from './entities/purchase-invoice-line.entity';
import { PurchaseInvoiceEntity } from './entities/purchase-invoice.entity';
import { mapLineToEntity } from './helpers/purchase-invoice.mapper';
import { PurchaseInvoiceViewService } from './purchase-invoice-view.service';

@Resolver(() => PurchaseInvoiceEntity)
export class PurchaseInvoiceResolver {
  constructor(private readonly purchaseInvoiceViewService: PurchaseInvoiceViewService) {}

  @Query(() => PurchaseInvoiceConnection, { name: 'getPurchaseInvoices' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => PurchaseInvoiceFilterInput, nullable: true })
    filter?: PurchaseInvoiceFilterInput,
  ) {
    return this.purchaseInvoiceViewService.findPaginated(paginationArgs, filter);
  }

  @ResolveField('lines', () => [PurchaseInvoiceLineEntity], { nullable: 'itemsAndList' })
  async getLines(
    @Parent() invoice: PurchaseInvoiceEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<PurchaseInvoiceLineEntity[]> {
    if (!loaders.invoiceLinesByInvoiceNumberLoader) {
      throw new Error('invoiceLinesByInvoiceNumberLoader is not defined in loaders');
    }
    const lineModels = await loaders.invoiceLinesByInvoiceNumberLoader.load(invoice.invoiceNumber);

    // Precisaremos de um mapper no helper
    return lineModels.map((line) => mapLineToEntity(line as any));
  }

  // Você também precisará de FieldResolvers para `supplier`, etc.
}
