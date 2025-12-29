import { Field, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsString } from 'class-validator';
import { IsYear } from 'src/common/decorators/is-year.decorator';

@InputType()
export class AccountBalanceFilter {
  @Field(() => String, { nullable: true, description: 'Filter by site.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  site_equals?: string;

  @Field(() => String, { nullable: true, description: 'Ledger to filter account balances.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  ledger_equals?: string;

  @Field(() => Int, { nullable: true, description: 'Fiscal year to filter account balances.' })
  @IsYear()
  fiscalYear_equals?: number;

  @Field(() => String, { nullable: true, description: 'Account to filter account balances.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  account_equals?: string;

  @Field(() => String, { nullable: true, description: 'Fixture to filter account balances.' })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  fixture_equals?: string;
}
