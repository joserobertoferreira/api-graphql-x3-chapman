import { ObjectType } from '@nestjs/graphql';
import { Paginated } from 'src/common/pagination/pagination.types';
import { PaymentTermEntity } from './payment-term.entity';

@ObjectType()
export class PaymentTermConnection extends Paginated(PaymentTermEntity) {}
