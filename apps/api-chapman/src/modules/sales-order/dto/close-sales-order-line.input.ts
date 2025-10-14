import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

@InputType({ description: 'Closing a sales order line' })
export class CloseSalesOrderLineInput {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => [Int], { description: 'A list of sales order line numbers to close' })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true }) // Ensure each item in the array is validated
  lines!: number[];
}
