import { Field, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

@InputType({ description: 'Data to create or update a sales order line text' })
export class CreateSalesOrderLineTextInput {
  @Field(() => Number, { description: 'Sales order line number' })
  @IsNotEmpty()
  lineNumber: number;

  @Field(() => String, { nullable: true, description: 'Sales order line text' })
  @IsString()
  orderLineText: string;
}

@InputType({ description: 'Data to create or update a sales order text, include header and lines' })
export class CreateSalesOrderTextInput {
  @Field(() => String, { description: 'Sales order number' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  orderNumber: string;

  @Field(() => String, { nullable: true, description: 'Sales order header text' })
  @IsString()
  orderHeaderText?: string;

  @Field(() => String, { nullable: true, description: 'Sales order footer text' })
  @IsString()
  orderFooterText?: string;

  @Field(() => [CreateSalesOrderLineTextInput], {
    nullable: 'itemsAndList',
    description: 'List of sales order line texts',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineTextInput)
  @IsOptional()
  lineTexts?: CreateSalesOrderLineTextInput[];
}
