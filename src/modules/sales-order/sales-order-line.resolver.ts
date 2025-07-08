import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductService } from '../products/product.service';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';

@Resolver(() => SalesOrderLineEntity)
export class SalesOrderLineResolver {
  constructor(private readonly productService: ProductService) {}

  @ResolveField('product', () => ProductEntity)
  async getProduct(
    @Parent() line: SalesOrderLineEntity,
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<ProductEntity> {
    const productModel = await loaders.productLoader.load(line.productCode);

    if (!productModel) {
      throw new Error(`Product with code ${line.productCode} not found for order line.`);
    }

    return this.productService.mapToEntity(productModel as any);
  }
}
