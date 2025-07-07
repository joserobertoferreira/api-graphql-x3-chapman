import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { GraphQLFormattedError } from 'graphql';
import { join } from 'path';
import { DecimalModule } from './common/decimal/decimal.module';
import { DecimalScalar } from './common/utils/scalars.utils';
import { DataloaderModule } from './dataloader/dataloader.module';
import { DataloaderService } from './dataloader/dataloader.service';
import { CompanyModule } from './modules/companies/company.module';
import { CustomerModule } from './modules/customers/customer.module';
import { ProductModule } from './modules/products/product.module';
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
          const originalError = error.extensions?.originalError;

          if (originalError) {
            if (process.env.NODE_ENV === 'production') {
              return {
                message: originalError.message || error.message,
                locations: formattedError.locations,
                path: formattedError.path,
                extensions: {
                  code: originalError.error || 'INTERNAL_SERVER_ERROR',
                  status: originalError.statusCode || 500,
                },
              };
            }

            return {
              message: originalError.message || error.message,
              locations: formattedError.locations,
              path: formattedError.path,
              extensions: {
                code: originalError.error || 'INTERNAL_SERVER_ERROR',
                status: originalError.statusCode || 500,
                stacktrace: error.extensions?.stacktrace, // Pega o stacktrace da extensão
              },
            };
          }

          // Se não for uma exceção do NestJS (ex: erro de validação do GraphQL),
          if (process.env.NODE_ENV === 'production') {
            if (formattedError.extensions) {
              delete formattedError.extensions.stacktrace;
            }
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
  ],
  controllers: [],
  providers: [DecimalScalar],
})
export class AppModule {}
