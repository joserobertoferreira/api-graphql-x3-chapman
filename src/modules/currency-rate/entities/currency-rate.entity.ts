import { Field, Float, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';

@ObjectType('CurrencyRate')
export class CurrencyRateEntity {
  @Field(() => ExchangeRateTypeGQL, { description: 'Rate type.' })
  rateType: ExchangeRateTypeGQL;

  @Field(() => GraphQLDate, { description: 'Rate date' })
  rateDate: Date;

  @Field({ description: 'Source currency.' })
  sourceCurrency: string;

  @Field({ description: 'Destination currency.' })
  destinationCurrency: string;

  @Field(() => Float, { nullable: true, description: 'Rate' })
  rate?: number;

  @Field(() => Float, { nullable: true, description: 'Inverse rate' })
  inverseRate?: number;
}
