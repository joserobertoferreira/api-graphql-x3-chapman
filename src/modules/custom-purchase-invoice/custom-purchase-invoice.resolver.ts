import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CommonBusinessPartnerNameEntity } from '../../common/outputs/common-dimension.entity';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { CustomPurchaseInvoiceViewService } from './custom-purchase-invoice-view.service';
import { CustomPurchaseInvoiceFilterInput } from './dto/filter-custom-purchase-invoice.input';
import { CustomPurchaseInvoiceConnection } from './entities/custom-purchase-invoice-connection.entity';
import { CustomPurchaseInvoiceEntity } from './entities/custom-purchase-invoice.entity';

@Resolver(() => CustomPurchaseInvoiceEntity)
export class CustomPurchaseInvoiceResolver {
  constructor(private readonly purchaseInvoiceViewService: CustomPurchaseInvoiceViewService) {}

  @Query(() => CustomPurchaseInvoiceConnection, { name: 'customPurchaseInvoices' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => CustomPurchaseInvoiceFilterInput, nullable: true })
    filter?: CustomPurchaseInvoiceFilterInput,
  ) {
    return this.purchaseInvoiceViewService.findPaginated(paginationArgs, filter);
  }

  @ResolveField('billBySupplier', () => CommonBusinessPartnerNameEntity, { nullable: true })
  async getSupplier(
    @Parent() invoice: CustomPurchaseInvoiceEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<CommonBusinessPartnerNameEntity | null> {
    const supplierCode = invoice.supplier;
    if (!supplierCode) {
      return null;
    }

    try {
      const supplier = await loaders.businessPartnerLoader.load(supplierCode);

      if (!supplier || supplier instanceof Error) {
        return null;
      }

      return {
        code: supplier.code,
        name: `${supplier.partnerName1} ${supplier.partnerName2}`.trim(),
      };
    } catch (error) {
      return null;
    }
  }
}
