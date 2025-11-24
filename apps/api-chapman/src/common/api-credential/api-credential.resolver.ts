import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../decorators/public.decorator';
import { ApiCredentialService } from './api-credential.service';
import { CreateApiCredentialInput, GetApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Resolver()
export class ApiCredentialResolver {
  constructor(private readonly apiCredentialService: ApiCredentialService) {}

  @Mutation(() => ApiCredentialEntity, { name: 'createApiCredential' })
  @Public()
  create(@Args('input') input: CreateApiCredentialInput) {
    return this.apiCredentialService.create(input);
  }

  @Query(() => ApiCredentialEntity, {
    name: 'getApiCredential',
    deprecationReason: 'For internal setup only. Used to retrieve existing credentials.',
  })
  // @Public()
  get(@Args('input') input: GetApiCredentialInput) {
    return this.apiCredentialService.get(input);
  }
}
