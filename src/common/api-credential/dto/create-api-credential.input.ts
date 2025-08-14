import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CreateApiCredentialInput {
  @Field({ description: 'The login for the new API user.' })
  @IsNotEmpty()
  login: string;

  @Field({ description: 'The password for the new API user.' })
  @IsNotEmpty()
  password: string;
}
