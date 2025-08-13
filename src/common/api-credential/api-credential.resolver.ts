import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '../decorators/public.decorator';
import { AdminGuard } from '../guards/admin.guard';
import { ApiCredentialService } from './api-credential.service';
import { CreateApiCredentialInput } from './dto/create-api-credential.input';
import { ApiCredentialEntity } from './entities/api-credential.entity';

@Resolver()
export class ApiCredentialResolver {
  constructor(private readonly apiCredentialService: ApiCredentialService) {}

  @Mutation(() => ApiCredentialEntity, { name: 'createApiCredential' })
  @Public()
  @UseGuards(AdminGuard) // Protege esta mutation específica
  create(@Args('input') input: CreateApiCredentialInput) {
    return this.apiCredentialService.create(input);
  }
}
