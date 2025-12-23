import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { SiteEntity } from './site.entity';

@ObjectType()
export class SiteConnection extends Paginated(SiteEntity) {}
