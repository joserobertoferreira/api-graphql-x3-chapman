import { BadRequestException, Injectable } from '@nestjs/common';
import { TaxCodeWithRates } from '../../../common/types/common.types';
import { SupplierInvoiceLineContext } from '../../../common/types/supplier-invoice.types';
import { Prisma } from '../../../generated/prisma/client';
import { CommonService } from '../../common/common.service';

@Injectable()
export class SupplierInvoiceLineTaxService {
  constructor(private readonly commonService: CommonService) {}

  /**
   * Calculate tax rates for invoice lines. Mutates each line's `amounts` in place,
   * filling `taxAmount`, `currencyAmountIncludingTax` and `deductableTax` (line
   * `amounts.currencyAmount` is entered tax-excluded, per header `priceOrAmountTaxType: 1`).
   *
   * @param lines - the invoice lines.
   * @param legislation - (Optional) The legislation associated with the order type.
   * @returns The same lines array, with tax fields filled in.
   */
  async calculateLineTaxes(
    lines: SupplierInvoiceLineContext[],
    legislation?: string,
  ): Promise<SupplierInvoiceLineContext[]> {
    // Get the distinct tax codes actually used by the lines
    const distinctTaxCodes = [
      ...new Set(lines.map((line) => line.taxCode?.trim()).filter((taxCode): taxCode is string => !!taxCode)),
    ];

    if (distinctTaxCodes.length === 0) {
      return lines;
    }

    // Get the tax object (with its most recent rate) for each tax code
    const taxGroup = new Map<string, TaxCodeWithRates>();

    for (const taxCode of distinctTaxCodes) {
      const taxData = await this.commonService.getTaxCodeWithRates({
        where: { code: taxCode, legislation },
        include: {
          rates: {
            orderBy: { validFrom: 'desc' },
            take: 1, // the most recent
          },
        },
      });

      if (!taxData) {
        throw new BadRequestException(`Tax code "${taxCode}" not found.`);
      }

      taxGroup.set(taxCode, taxData);
    }

    // Calculate the tax for each line
    for (const line of lines) {
      const taxCode = line.taxCode?.trim();

      if (!taxCode) continue;

      const taxData = taxGroup.get(taxCode);
      if (!taxData) {
        throw new BadRequestException(`Tax code "${taxCode}" not found.`);
      }

      const taxRate = taxData.rates[0]?.rate ?? new Prisma.Decimal(0);
      const deductible = taxData.rates[0]?.deductible ?? new Prisma.Decimal(100);

      const taxValue = line.amounts.currencyAmount
        .mul(taxRate)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_FLOOR);
      const taxDeductible = taxValue.mul(deductible).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_FLOOR);

      line.amounts.taxAmount = taxValue;
      line.amounts.currencyAmountIncludingTax = line.amounts.currencyAmount.add(taxValue);
      line.deductableTax = taxDeductible;
    }

    return lines;
  }
}
