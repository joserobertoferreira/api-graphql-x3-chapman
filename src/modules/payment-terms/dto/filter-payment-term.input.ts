import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class PaymentTermFilterInput {
  @Field({ nullable: true, description: 'The unique code for the payment term.' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  code_equals?: string;

  @Field({ nullable: true, description: 'Search term for the payment term description.' })
  @IsString()
  @IsOptional()
  description_contains?: string;

  @Field({ nullable: true, description: 'Filter by legislation.' })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  legislation_equals?: string;
}
