import { Decimal } from '@prisma/client/runtime/library';

type CalculatedPrice = {
  priceWithTax: Decimal;
  priceWithoutTax: Decimal;
  taxValue: Decimal;
};

/**
 * Calculates the net price, VAT value, and gross price based on the provided parameters.
 * @param price Gross price
 * @param type 1 | 2 (1 = without VAT, 2 = with VAT)
 * @param taxRate VAT percentage
 * @returns
 */
export function calculatePrice(price: Decimal, type: number, taxRate: number): CalculatedPrice {
  let netPrice: Decimal;
  let tax: Decimal;
  let grossPrice: Decimal;

  if (price === undefined || price === null) {
    price = new Decimal(0);
  }

  grossPrice = new Decimal(price);

  console.log(grossPrice.toString(), type, taxRate);

  if (type === 1) {
    // Preço sem IVA
    netPrice = grossPrice;
    tax = grossPrice.mul(taxRate).div(100);
    grossPrice = grossPrice.add(tax);

    console.log('Preço sem IVA', netPrice.toString(), 'IVA', tax.toString(), 'Preço com IVA', grossPrice.toString());
  } else if (type === 2) {
    // Preço com IVA
    const divider = new Decimal(1).plus(new Decimal(taxRate).div(100));
    netPrice = grossPrice.div(divider);
    tax = grossPrice.minus(netPrice);

    console.log('Preço sem IVA', netPrice.toString(), 'IVA', tax.toString(), 'Preço com IVA', grossPrice.toString());
  } else {
    throw new Error('Tipo de preço inválido. Use 1 (sem IVA) ou 2 (com IVA).');
  }

  return {
    priceWithoutTax: netPrice.toDecimalPlaces(3),
    taxValue: tax.toDecimalPlaces(0, Decimal.ROUND_HALF_FLOOR),
    priceWithTax: grossPrice.toDecimalPlaces(3),
  };
}

/**
 * Calculate margin based on the provided parameters.
 * @param site Site price
 * @param type 1 | 2 (1 = without VAT, 2 = with VAT)
 * @param referenceDate Reference date for the margin calculation
 * @param currency Currency code
 * @returns Calculated margin as a Decimal
 */
export function calculateMargin(site: Decimal, type: number, referenceDate: Date, currency: string): Decimal {
  // Placeholder for margin calculation logic
  // This function should be implemented based on specific business rules
  // For now, we return a fixed value for demonstration purposes
  return new Decimal(0);
}
