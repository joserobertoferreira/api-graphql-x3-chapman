import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../decorators/public.decorator';
import { AdminGuard } from '../guards/admin.guard';
import { BaseResolver } from '../resolvers/base.resolver';
import { ApiCredentialService } from './api-credential.service';
import { CreateApiCredentialInput, GetApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Resolver()
export class ApiCredentialResolver extends BaseResolver {
  constructor(private readonly apiCredentialService: ApiCredentialService) {
    super();
  }

  @Mutation(() => ApiCredentialEntity, { name: 'createApiCredential' })
  @Public()
  create(@Args('input') input: CreateApiCredentialInput) {
    return this.apiCredentialService.create(input);
  }

  @Query(() => ApiCredentialEntity, {
    name: 'getApiCredential',
    // deprecationReason: 'For internal setup only. Used to retrieve existing credentials.',
  })
  @Public()
  @UseGuards(AdminGuard)
  get(@Args('input') input: GetApiCredentialInput) {
    return this.apiCredentialService.get(input);
  }
}
