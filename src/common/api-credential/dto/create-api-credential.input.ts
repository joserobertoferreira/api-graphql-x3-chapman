import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

@InputType({ description: 'Inform the login and password to retrieve the credentials.' })
export class CreateApiCredentialInput {
  @Field({ description: 'The login for the new API user.' })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toLowerCase() : value))
  login: string;

  @Field({ description: 'The password for the new API user.' })
  @IsNotEmpty()
  password: string;
}
