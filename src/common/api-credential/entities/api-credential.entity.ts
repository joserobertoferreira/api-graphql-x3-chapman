import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ApiCredentialEntity {
  @Field({ description: 'The Client ID that was provided.' })
  clientId: string;

  @Field({ description: 'The generated App Key. Store this value.' })
  appKey: string;

  @Field({ description: 'The generated App Secret. Store this value securely. It will not be shown again.' })
  appSecret: string;
}
