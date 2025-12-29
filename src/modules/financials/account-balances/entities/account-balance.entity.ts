import { Field, Float, ObjectType } from '@nestjs/graphql';
import { LedgerTypeGQL } from 'src/common/registers/enum-register';

@ObjectType('AccountBalance', { description: 'Account balance entity representing an account balance in the system' })
export class AccountBalanceEntity {
  @Field(() => String, { nullable: true, description: 'Account balance site.' })
  site?: string;

  @Field(() => Number, { nullable: true, description: 'Account balance fiscal year.' })
  fiscalYear?: number;

  @Field(() => LedgerTypeGQL, { nullable: true, description: 'Account balance ledger type.' })
  ledgerTypeNumber?: LedgerTypeGQL;

  @Field(() => String, { nullable: true, description: 'Account balance ledger.' })
  ledger?: string;

  @Field(() => String, { nullable: true, description: 'Ledger currency.' })
  ledgerCurrency?: string;

  @Field(() => String, { nullable: true, description: 'Account balance account.' })
  account?: string;

  @Field(() => String, { nullable: true, description: 'Account balance business partner.' })
  businessPartner?: string;

  @Field(() => String, { nullable: true, description: 'Fixture dimension.' })
  fixture?: string;

  @Field(() => [AccountBalanceDimensionsEntity], {
    nullable: 'itemsAndList',
    description: 'List of account balance dimensions.',
  })
  dimensions?: AccountBalanceDimensionsEntity[];
}

@ObjectType('AccountBalanceDimensions', {
  description: 'Account balance dimensions entity representing various dimensions related to an account balance',
})
export class AccountBalanceDimensionsEntity {
  @Field(() => String, { nullable: true, description: 'Broker dimension detail.' })
  broker?: string;

  @Field(() => String, { nullable: true, description: 'Department dimension detail.' })
  department?: string;

  @Field(() => String, { nullable: true, description: 'Location dimension detail.' })
  location?: string;

  @Field(() => String, { nullable: true, description: 'Type dimension detail.' })
  type?: string;

  @Field(() => String, { nullable: true, description: 'Product dimension detail.' })
  product?: string;

  @Field(() => String, { nullable: true, description: 'Analysis dimension detail.' })
  analysis?: string;

  @Field(() => [AccountBalanceAmountsEntity], {
    nullable: 'itemsAndList',
    description: 'List of account balance amounts.',
  })
  amounts?: AccountBalanceAmountsEntity[];
}

@ObjectType('AccountBalanceAmounts', {
  description: 'Account balance amounts entity representing amounts related to an account balance',
})
export class AccountBalanceAmountsEntity {
  @Field(() => Float, { nullable: true, description: 'Debit amount in ledger currency.' })
  debitAmountInLedgerCurrency?: number;

  @Field(() => Float, { nullable: true, description: 'Credit amount in ledger currency.' })
  creditAmountInLedgerCurrency?: number;

  @Field(() => String, { nullable: true, description: 'Currency.' })
  currency?: string;

  @Field(() => Float, { nullable: true, description: 'Debit amount in currency.' })
  debitAmountInCurrency?: number;

  @Field(() => Float, { nullable: true, description: 'Credit amount in currency.' })
  creditAmountInCurrency?: number;
}
