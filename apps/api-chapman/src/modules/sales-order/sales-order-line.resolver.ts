import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductService } from '../products/product.service';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';

@Resolver(() => SalesOrderLineEntity)
export class SalesOrderLineResolver {
  constructor(private readonly productService: ProductService) {}

  @ResolveField('product', () => ProductEntity, { nullable: true })
  async getProduct(
    @Parent() line: SalesOrderLineEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<ProductEntity | null> {
    if (!line.productCode) {
      return null;
    }

    const productModel = await loaders.productLoader.load(line.productCode);

    try {
      if (!productModel) {
        return null;
      }

      return this.productService.mapToEntity(productModel as any);
    } catch (error) {
      console.error(`Product with code ${line.productCode} not found for order line.`, error);
      return null;
    }
  }
}
