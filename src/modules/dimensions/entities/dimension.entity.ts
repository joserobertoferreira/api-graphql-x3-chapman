import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OtherDimension')
export class OtherDimensionEntity {
  @Field(() => String, { description: 'The unique code for the dimension type.' })
  dimensionType!: string;

  @Field(() => String, { description: 'The unique code for the new dimension.' })
  dimension!: string;
}

@ObjectType('CustomerDimension')
export class CustomerDimensionEntity {
  @Field(() => String, { description: 'Customer code for dimension.' })
  customerCode!: string;

  @Field(() => String, { description: 'Customer name.' })
  customerName!: string;
}

@ObjectType('Dimension')
export class DimensionEntity {
  @Field({ description: 'The type of this dimension.' })
  dimensionType: string;

  @Field({ description: 'The dimension value.' })
  dimension: string;

  @Field({ nullable: true, description: 'Full description of the dimension.' })
  description?: string;

  @Field(() => Boolean, { nullable: true, description: 'Indicates if the dimension is active.' })
  isActive?: boolean;

  @Field({ nullable: true, description: 'Company/Site/Group code for the dimension.' })
  site?: string;

  @Field(() => CustomerDimensionEntity, { nullable: true, description: 'Customer code for the dimension.' })
  fixtureCustomer?: CustomerDimensionEntity;

  // Propriedade interna para armazenar o código do cliente do fixture
  fixtureCustomerCode?: string;

  @Field({ nullable: true, description: 'Broker email address associated with the dimension.' })
  brokerEmail?: string;

  @Field(() => [OtherDimensionEntity], {
    nullable: 'itemsAndList',
    description: 'List of other related dimension codes.',
  })
  otherDimensions?: OtherDimensionEntity[];
}
