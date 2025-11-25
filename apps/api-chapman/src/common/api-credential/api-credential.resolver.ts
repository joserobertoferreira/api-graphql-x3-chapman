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
    console.log('Accessing getApiCredential with input:', input);

    // if (input.login.toLowerCase() !== 'excel') {
    //   // Se não for, lance uma exceção imediatamente.
    //   // UnauthorizedException (401) é apropriado aqui.
    //   throw new UnauthorizedException('Access denied for this endpoint.');
    // }

    return this.apiCredentialService.get(input);
  }
}
