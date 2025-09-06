import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateProductInput } from './dto/create-product.input';
import { ProductEntity } from './entities/product.entity';
import { ProductService } from './product.service';
// import { UpdateProductInput } from './dto/update-product.input';
import { Prisma } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { ProductFilter } from './dto/filter-product.input';
import { ProductConnection } from './entities/product-connection.entity';

@Resolver(() => ProductEntity)
export class ProductResolver {
  constructor(private readonly productService: ProductService) {}

  // === MUTATIONS ===

  @Mutation(() => ProductEntity, { name: 'createProduct' })
  createProduct(@Args('input') createProductInput: CreateProductInput) {
    console.log('Objeto createProductInput recebido:', JSON.stringify(createProductInput, null, 2));

    createProductInput.basePrice = (
      createProductInput.basePrice ? new Prisma.Decimal(createProductInput.basePrice) : new Prisma.Decimal(0)
    ).toNumber();

    return this.productService.create(createProductInput);
  }

  // Deixamos a estrutura pronta para quando formos implementar o update
  /*
  @Mutation(() => ProductEntity, { name: 'updateProduct' })
  updateProduct(@Args('input') updateProductInput: UpdateProductInput) {
    return this.productService.update(updateProductInput);
  }
  */

  // E o remove
  /*
  @Mutation(() => ProductEntity, { name: 'removeProduct' })
  removeProduct(@Args('code', { type: () => ID }) code: string) {
    return this.productService.remove(code);
  }
  */

  // Query para buscar um único produto pelo código
  // @Query(() => ProductEntity, { name: 'product', nullable: true })
  // findOne(@Args('code', { type: () => ID }) code: string) {
  //   return this.productService.findOne(code);
  // }

  // Query paginada e com filtros para buscar múltiplos produtos
  @Query(() => ProductConnection, { name: 'getProducts' })
  findPaginated(
    @Args() paginationArgs: PaginationArgs,
    @Args('filter', { type: () => ProductFilter, nullable: true })
    filter?: ProductFilter,
  ) {
    return this.productService.findPaginated(paginationArgs, filter);
  }
}
