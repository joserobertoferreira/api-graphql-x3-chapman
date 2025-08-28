import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a user in the system' })
export class UserEntity {
  @Field(() => ID, { description: 'User code' })
  code!: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  email?: string;

  // @Field(() => Boolean, { nullable: true })
  // isActive?: boolean;
}
