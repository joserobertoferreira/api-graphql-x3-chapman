import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLFormattedError } from 'graphql';
import { join } from 'path';
import { DecimalModule } from './common/decimal/decimal.module';
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
        formatError: (formattedError: GraphQLFormattedError, error: any) => {
          const originalError = error.extensions;

          if (originalError?.code === 'BAD_REQUEST' && originalError?.response?.errors) {
            return {
              message: originalError.response.message || 'Input validation failed',
              locations: formattedError.locations,
              path: formattedError.path,
              extensions: {
                code: 'BAD_REQUEST', // Código de erro claro
                status: 400,
                // Incluímos o nosso array de erros detalhados
                validationErrors: originalError.response.errors,
              },
            };
          }

          if (originalError?.code) {
            const errorResponse = originalError.response || {};
            const errorExtensions = {
              code: originalError.code || 'INTERNAL_SERVER_ERROR',
              status: errorResponse.statusCode || 500,
            };

            if (process.env.NODE_ENV !== 'production') {
              errorExtensions['stacktrace'] = originalError.stacktrace;
            }

            return {
              message: error.message,
              locations: formattedError.locations,
              path: formattedError.path,
              extensions: errorExtensions,
            };
          }

          // Se não for uma exceção do NestJS (ex: erro de validação do GraphQL),
          if (process.env.NODE_ENV === 'production' && formattedError.extensions) {
            delete formattedError.extensions.stacktrace;
          }

          return formattedError;
        },
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
  ],
  controllers: [],
  providers: [DecimalScalar, DimensionsValidator],
})
export class AppModule {}
