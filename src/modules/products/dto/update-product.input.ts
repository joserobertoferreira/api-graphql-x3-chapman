import { Field, ID, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { CreateProductInput } from './create-product.input';

@InputType()
class UpdateProductDataInput extends PartialType(
  OmitType(CreateProductInput, ['code', 'productCategoryCode'] as const),
) {}

@InputType()
export class UpdateProductInput {
  @Field(() => ID, { description: 'The code of the product to update.' })
  code: string;

  @Field(() => UpdateProductDataInput)
  data: UpdateProductDataInput;
}
