import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { SalesOrderLine } from '@prisma/client';
import { IDataloaders } from '../../dataloader/dataloader.service';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductService } from '../products/product.service';
import { SalesOrderLineEntity } from './entities/sales-order-line.entity';

@Resolver(() => SalesOrderLineEntity)
export class SalesOrderLineResolver {
  constructor(private readonly productService: ProductService) {}

  @ResolveField('product', () => ProductEntity)
  async getProduct(
    @Parent() line: SalesOrderLine, // O pai é o objeto da linha do Prisma
    @Context() { loaders }: { loaders: IDataloaders },
  ): Promise<ProductEntity> {
    const productModel = await loaders.productLoader.load(line.product);

    // Reutilizamos o mapeador do ProductService
    return this.productService.mapToEntity(productModel as any);
  }
}
