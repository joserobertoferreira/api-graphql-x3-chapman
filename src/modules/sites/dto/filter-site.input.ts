import { Field, InputType } from '@nestjs/graphql';
import { AddressFilterInput } from '../../addresses/dto/filter-address.input';

@InputType()
export class SiteFilterInput {
  // Filtro nos campos do próprio Site
  @Field({ nullable: true, description: 'Filter by site name (exact match)' })
  siteName_equals?: string;

  // Filtro aninhado nos endereços do Site
  @Field(() => AddressFilterInput, { nullable: true, description: 'Filter sites by their address properties' })
  address?: AddressFilterInput;
}
