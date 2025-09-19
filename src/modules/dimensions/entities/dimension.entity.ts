import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLDate } from 'graphql-scalars';

// @ObjectType('OtherDimension')
// export class OtherDimensionEntity {
//   @Field(() => String, { description: 'The unique code for the dimension type.' })
//   dimensionType!: string;

//   @Field(() => String, { description: 'The unique code for the new dimension.' })
//   dimension!: string;
// }

@ObjectType('CustomerDimension')
export class CustomerDimensionEntity {
  @Field(() => String, { description: 'Customer code.' })
  code: string;

  @Field(() => String, { description: 'Customer name.' })
  name: string;
}

@ObjectType('GeneralDimension')
export class GeneralDimensionEntity {
  @Field(() => Boolean, { nullable: true, description: 'Active/Inactive status of the dimension.' })
  isActive?: boolean;

  @Field(() => String, { nullable: true, description: 'Company/Site/Group code for the dimension.' })
  companySiteGroup?: string;

  @Field(() => CustomerDimensionEntity, { nullable: true, description: 'Fixture customer.' })
  fixtureCustomer?: CustomerDimensionEntity;

  @Field(() => String, { nullable: true, description: 'Broker email address associated with the dimension.' })
  brokerEmail?: string;

  @Field(() => GraphQLDate, { nullable: true, description: 'Valid from - YYYY-MM-DD.' })
  validFrom?: Date;

  @Field(() => GraphQLDate, { nullable: true, description: 'Valid until - YYYY-MM-DD.' })
  validUntil?: Date;
}

@ObjectType('ServiceDimension')
export class ServiceDimensionEntity {
  @Field(() => GraphQLDate, { description: 'Service start date - YYYY-MM-DD.' })
  serviceDateStart: Date;

  @Field(() => GraphQLDate, { description: 'Service end date - YYYY-MM-DD.' })
  serviceDateEnd: Date;

  @Field(() => String, { nullable: true, description: 'Sales person code.' })
  salesPerson?: string;
}

@ObjectType('FlightDimension')
export class FlightDimensionEntity {
  @Field(() => String, { description: 'Flight Reference ID.' })
  flightReference: string;

  @Field(() => GraphQLDate, { description: 'Flight date - YYYY-MM-DD.' })
  flightDate: Date;

  @Field(() => String, { description: 'Flight origin.' })
  flightOrigin: string;

  @Field(() => String, { description: 'Flight destination.' })
  flightDestination: string;
}

@ObjectType('Dimension')
export class DimensionEntity {
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

  @Field(() => GeneralDimensionEntity, { nullable: true, description: 'General dimension details.' })
  general?: GeneralDimensionEntity;

  @Field(() => ServiceDimensionEntity, { nullable: true, description: 'Service dimension details.' })
  service?: ServiceDimensionEntity;

  @Field(() => FlightDimensionEntity, { nullable: true, description: 'Flight dimension details.' })
  flight?: FlightDimensionEntity;

  // Internal use only, not exposed in GraphQL
  fixtureCustomerCode?: string;
  isActiveFlag?: boolean;
  companySiteGroupCode?: string;
  brokerEmailCode?: string;
  validateFrom?: Date;
  validateUntil?: Date;

  // @Field(() => [OtherDimensionEntity], {
  //   nullable: 'itemsAndList',
  //   description: 'List of other related dimension codes.',
  // })

  // otherDimensions?: OtherDimensionEntity[];
}
