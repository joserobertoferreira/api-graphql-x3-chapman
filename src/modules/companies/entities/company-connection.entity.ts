import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { CompanyEntity } from './company.entity';

@ObjectType()
export class CompanyConnection extends Paginated(CompanyEntity) {}
