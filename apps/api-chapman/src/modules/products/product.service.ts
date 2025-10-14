import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { DecimalConverter } from '../../common/decimal/decimal.converter';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { ProductCategoryService } from '../product-categories/product-category.service';
import { CreateProductInput } from './dto/create-product.input';
import { ProductFilter } from './dto/filter-product.input';
import { ProductConnection } from './entities/product-connection.entity';
import { ProductEntity } from './entities/product.entity';
import { buildProductCreationPayloads } from './helpers/product-payload-builder';
import { buildProductWhereClause } from './helpers/product-where-builder';

const productInclude = Prisma.validator<Prisma.ProductsInclude>()({
  productSales: true,
});

type ProductsWithRelations = Prisma.ProductsGetPayload<{
  include: typeof productInclude;
}>;

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productCategoryService: ProductCategoryService,
    private readonly decimalConverter: DecimalConverter,
  ) {}

  public mapToEntity(product: ProductsWithRelations): ProductEntity {
    const descriptions = [product.description1, product.description2, product.description3].filter(
      (desc): desc is string => !!desc && desc.trim() !== '',
    );

    const taxesLevel = [product.taxLevel1, product.taxLevel2, product.taxLevel3].filter(
      (tax): tax is string => !!tax && tax.trim() !== '',
    );

    const productStatisticalGroup = [
      product.productStatisticalGroup1,
      product.productStatisticalGroup2,
      product.productStatisticalGroup3,
      product.productStatisticalGroup4,
      product.productStatisticalGroup5,
    ].filter((group): group is string => !!group && group.trim() !== '');

    return {
      code: product.code,
      descriptions,
      salesUnit: product.salesUnit,
      purchaseUnit: product.purchaseUnit,
      productCategory: product.productCategory,
      taxesLevel,
      productStatisticalGroup,
      basePrice: product.productSales?.basePrice.toNumber() ?? undefined,
    };
  }

  async findAll(): Promise<ProductEntity[]> {
    const products = await this.prisma.products.findMany({
      include: productInclude,
    });
    return products.map(this.mapToEntity.bind(this));
  }

  async findOne(code: string): Promise<ProductEntity> {
    const product = await this.prisma.products.findUnique({
      where: { code },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException(`Product with code ${code} not found`);
    }

    return this.mapToEntity(product);
  }

  async findPaginated(args: PaginationArgs, filter?: ProductFilter): Promise<ProductConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildProductWhereClause(filter);

    const [products, totalCount] = await this.prisma.$transaction([
      this.prisma.products.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        include: productInclude,
        orderBy: [{ code: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.products.count({ where: where }),
    ]);

    const hasNextPage = products.length > first;
    const nodes = hasNextPage ? products.slice(0, -1) : products;

    // 4. Mapeia os resultados e constrói a resposta da conexão
    const edges = nodes.map((product) => ({
      cursor: Buffer.from(product.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(product),
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  async create(input: CreateProductInput): Promise<ProductEntity> {
    // Verifica se já existe um produto com o mesmo código
    const existingProduct = await this.prisma.products.findUnique({
      where: { code: input.code },
    });
    if (existingProduct) {
      throw new NotFoundException(`Product with code ${input.code} already exists`);
    }

    // Busca a categoria
    const category = await this.productCategoryService.findCategory('', input.productCategoryCode);
    if (!category) {
      throw new NotFoundException(`Product category "${input.productCategoryCode}" not found.`);
    }

    // Verifica se o valor basePrice é válido
    // if (input.basePrice && !this.decimalConverter.isValid(input.basePrice)) {
    if (!input.basePrice) {
      throw new BadRequestException('Invalid basePrice value. It must be a valid decimal number.');
    }

    try {
      // input.basePrice = this.decimalConverter.toDecimal(input.basePrice).toString();

      const { productMaster, productSales } = buildProductCreationPayloads(input, category);

      // Executa a criação em uma transação para garantir a atomicidade
      const newProduct = await this.prisma.$transaction(async (tx) => {
        const createdProduct = await tx.products.create({
          data: productMaster,
        });

        if (productSales) {
          await tx.productSales.create({
            data: productSales,
          });
        }

        return createdProduct;
      });

      if (!newProduct.code) {
        throw new InternalServerErrorException('Could not create Product.');
      }

      return this.findOne(newProduct.code);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        // Ex: Violação de unique constraint
        if (error.code === 'P2002') {
          throw new ConflictException('A record with the provided data already exists.');
        }
      }

      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Failed to create product:', error);
      throw new InternalServerErrorException('Could not create product.');
    }
  }
}
