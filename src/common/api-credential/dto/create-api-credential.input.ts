import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateApiCredentialInput {
  @Field({ description: 'A unique, human-readable identifier for the client (e.g., "INTEGRATION_PARTNER_X").' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  clientId: string;

  @Field({ description: 'A description of who or what will use this credential.' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  description: string;
}
