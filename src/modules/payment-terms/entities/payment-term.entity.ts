import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('PaymentTerm')
export class PaymentTermEntity {
  @Field(() => ID, { description: 'The unique code for the payment term.' })
  code!: string;

  @Field({ nullable: true, description: 'The description of the payment term.' })
  description?: string;

  @Field({ nullable: true, description: 'The payment term legislation.' })
  legislation?: string;
}
