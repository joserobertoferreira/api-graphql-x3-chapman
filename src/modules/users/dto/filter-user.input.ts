import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class UserFilter {
  @Field(() => String, { nullable: true, description: 'Filter users by full or partial name' })
  @IsOptional()
  @IsString()
  name_contains?: string;

  @Field(() => String, { nullable: true, description: 'Filter by user code' })
  @IsOptional()
  @IsString()
  code_equals?: string;

  @Field(() => String, { nullable: true, description: 'Filter by full or partial user email' })
  @IsOptional()
  @IsString()
  email_contains?: string;
}
