import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

@InputType({ description: 'Inform the activity code to retrieve the dimension.' })
export class GetActivityCodeDimensionInput {
  @Field(() => String, { description: 'The activity code.' })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value?.toUpperCase() : value))
  activityCode: string;
}
