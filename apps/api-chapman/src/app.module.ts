import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { ApiCredentialModule } from './common/api-credential/api-credential.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { DecimalModule } from './common/decimal/decimal.module';
import { LoggingValidationPipe } from './common/pipes/logging-validation.pipe';
import './common/registers/enum-register';
import { TranslateTextModule } from './common/translate/translate-text.module';
import { DecimalScalar } from './common/utils/scalars.utils';
import { ValidatorsModule } from './common/validators/validators.module';
import { DataloaderModule } from './dataloader/dataloader.module';
import { DataloaderService } from './dataloader/dataloader.service';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/companies/company.module';
import { CurrencyRateModule } from './modules/currency-rate/currency-rate.module';
import { CustomPurchaseInvoiceModule } from './modules/custom-purchase-invoice/custom-purchase-invoice.module';
import { CustomerModule } from './modules/customers/customer.module';
import { DimensionTypeModule } from './modules/dimension-types/dimension-type.module';
import { DimensionModule } from './modules/dimensions/dimension.module';
import { IntercompanyJournalEntryModule } from './modules/intercompany-journal-entry/intercompany-journal-entry.module';
import { JournalEntryModule } from './modules/journal-entry/journal-entry.module';
import { ProductModule } from './modules/products/product.module';
import { PurchaseOrderModule } from './modules/purchase-order/purchase-order.module';
import { SalesOrderModule } from './modules/sales-order/sales-order.module';
import { SiteModule } from './modules/sites/site.module';
import { SupplierModule } from './modules/suppliers/supplier.module';
import { UserModule } from './modules/users/user.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    CryptoModule,
    ApiCredentialModule,
    AuthModule,
    DataloaderModule,
    UserModule,
    CustomerModule,
    SupplierModule,
    CompanyModule,
    ValidatorsModule,
    SiteModule,
    ProductModule,
    DecimalModule,
    SalesOrderModule,
    PurchaseOrderModule,
    DimensionTypeModule,
    DimensionModule,
    TranslateTextModule,
    CurrencyRateModule,
    JournalEntryModule,
    IntercompanyJournalEntryModule,
    CustomPurchaseInvoiceModule,
    // PurchaseInvoiceModule,
  ],
  controllers: [],
  providers: [DecimalScalar, { provide: 'APP_PIPE', useClass: LoggingValidationPipe }],
})
export class AppModule {}
