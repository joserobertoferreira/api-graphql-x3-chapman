import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from '../../common/decorators/public.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { BaseResolver } from '../../common/resolvers/base.resolver';
import { CommonService } from './common.service';
import { GetActivityCodeDimensionInput } from './dto/filter-activity-code.input';
import { ActivityCodeDimensionEntity } from './entities/activity-code.entity';

@Resolver()
export class CommonResolver extends BaseResolver {
  constructor(private readonly commonService: CommonService) {
    super();
  }

  @Query(() => ActivityCodeDimensionEntity, {
    name: 'getActivityCodeDimension',
    // deprecationReason: 'For internal setup only. Used to retrieve existing credentials.',
  })
  @Public()
  @UseGuards(AdminGuard)
  async getActivityCodeDimension(
    @Args('input') input: GetActivityCodeDimensionInput,
  ): Promise<ActivityCodeDimensionEntity> {
    const size = await this.commonService.getActivityCodeDimension(input.activityCode);

    if (size === undefined || size === null) {
      return { screenSize: 0 };
    }

    return { screenSize: size };
  }
}
