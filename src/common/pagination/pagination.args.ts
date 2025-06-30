import { ArgsType, Field, Int } from '@nestjs/graphql';

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: 10, description: 'Number of items to return' })
  first: number;

  @Field(() => String, { nullable: true, description: 'Cursor for the next page' })
  after?: string;
}
