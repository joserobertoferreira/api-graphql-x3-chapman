import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { CurrencyRateEntity } from './currency-rate.entity';

@ObjectType()
export class CurrencyRateConnection extends Paginated(CurrencyRateEntity) {}
