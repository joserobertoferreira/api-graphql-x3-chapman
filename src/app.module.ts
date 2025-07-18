import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { DecimalModule } from './common/decimal/decimal.module';
import { TranslateTextModule } from './common/translate/translate-text.module';
import { DecimalScalar } from './common/utils/scalars.utils';
import { DimensionsValidator } from './common/validators/dimensions.validator';
import { DataloaderModule } from './dataloader/dataloader.module';
import { DataloaderService } from './dataloader/dataloader.service';
import { CompanyModule } from './modules/companies/company.module';
import { CustomerModule } from './modules/customers/customer.module';
import { DimensionTypeModule } from './modules/dimension-types/dimension-type.module';
import { DimensionModule } from './modules/dimensions/dimension.module';
import { ProductModule } from './modules/products/product.module';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { SiteModule } from './modules/sites/site.module';
import { SupplierModule } from './modules/suppliers/supplier.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [DataloaderModule, DecimalModule],
      useFactory: (dataloaderService: DataloaderService) => ({
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        introspection: true,
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
        context: () => ({
          loaders: dataloaderService.createLoaders(),
        }),
      }),
      inject: [DataloaderService],
    }),
    PrismaModule,
    DataloaderModule,
    CustomerModule,
    SupplierModule,
    CompanyModule,
    SiteModule,
    ProductModule,
    DecimalModule,
    SalesOrderModule,
    DimensionTypeModule,
    DimensionModule,
    TranslateTextModule,
  ],
  controllers: [],
  providers: [DecimalScalar, DimensionsValidator],
})
export class AppModule {}
