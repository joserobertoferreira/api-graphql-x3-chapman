import { Field, ObjectType } from '@nestjs/graphql';
import { CustomerDimensionEntity } from '../../modules/dimensions/entities/dimension.entity';

@ObjectType('PurchaseOrderDimension')
export class PurchaseOrderDimensionEntity {
  @Field({ description: 'The type of this dimension.' })
  dimensionType: string;

  @Field({ description: 'The dimension value.' })
  dimension: string;

  @Field({ nullable: true, description: 'Additional information of the dimension.' })
  additionalInfo?: string;

  @Field(() => String, { nullable: true, description: 'Short description of the dimension.' })
  shortTitle?: string;

  @Field(() => String, { nullable: true, description: 'Pioneer reference for the dimension.' })
  pioneerReference?: string;

  @Field(() => CustomerDimensionEntity, { nullable: true, description: 'Fixture customer.' })
  fixtureCustomer?: CustomerDimensionEntity;

  @Field(() => String, { nullable: true, description: 'Broker email address associated with the dimension.' })
  brokerEmail?: string;
}
