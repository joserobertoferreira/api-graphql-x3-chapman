import { Field, ID, InputType, PartialType } from '@nestjs/graphql';
import { CreateCustomerInput } from './create-customer.input';

// Usamos PartialType para fazer todos os campos do CreateCustomerInput opcionais
@InputType()
export class UpdateCustomerDataInput extends PartialType(CreateCustomerInput) {}

@InputType()
export class UpdateCustomerInput {
  @Field(() => ID, { description: 'The code of the customer to update.' })
  code: string;

  @Field(() => UpdateCustomerDataInput)
  data: UpdateCustomerDataInput;
}
