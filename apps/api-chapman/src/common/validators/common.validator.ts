import { Injectable } from '@nestjs/common';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { CurrencyService } from '../services/currency.service';

@ValidatorConstraint({ name: 'currencyValidator', async: true })
@Injectable()
export class CurrencyValidator implements ValidatorConstraintInterface {
  constructor(private readonly currencyService: CurrencyService) {}

  async validate(currency: string, args?: ValidationArguments): Promise<boolean> {
    if (!currency) {
      return true;
    }

    return await this.currencyService.currencyExists(currency);
  }

  defaultMessage?(args?: ValidationArguments): string {
    return 'Currency does not exist';
  }
}
