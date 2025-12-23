import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { ArrayMinSize, IsArray, IsInt, IsOptional } from 'class-validator';

@InputType({ description: 'Closing a sales order line' })
export class CloseSalesOrderLineInput {
  @Field(() => ID, { description: 'The unique sales order number' })
  orderNumber!: string;

  @Field(() => [Int], {
    nullable: true,
    description: 'A list of sales order line numbers to close. If not provided, all lines will be closed.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true }) // Ensure each item in the array is validated
  lines?: number[];
}
