import { Prisma } from '@prisma/client';
import { toDecimal } from '../../../common/utils/decimal.utils';

/**
 * Calcula múltiplos totais agregados, juntando informações de um array de preços e um de linhas.
 * Para cada chave fornecida em `keysToCalculate`, calcula a soma de (price[key] * line[quantity]).
 *
 * @param pricesArray O array de objetos de preço (SalesOrderPrice).
 * @param linesArray O array de objetos de linha (SalesOrderLine).
 * @param keysToCalculate Um array de chaves do objeto de preço cujos valores devem ser calculados.
 * @returns Um objeto onde cada chave é uma das `keysToCalculate` e seu valor é o total acumulado como Decimal.
 */
export function calculateSalesOrderTotals<K extends keyof Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput>(
  pricesArray: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[],
  linesArray: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[],
  keysToCalculate: K[],
): Record<K, Prisma.Decimal> {
  // Pré-processar o array de linhas para uma busca O(1) usando um Map.
  const linesMap = new Map<string, Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput>();
  for (const line of linesArray) {
    if (line.lineNumber !== undefined && line.sequenceNumber !== undefined) {
      const compositeKey = `${line.lineNumber}-${line.sequenceNumber}`;
      linesMap.set(compositeKey, line);
    }
  }

  // Começamos com todas as chaves desejadas com um valor de Decimal(0).
  const initialTotals = Object.fromEntries(keysToCalculate.map((key) => [key, new Prisma.Decimal(0)])) as Record<
    K,
    Prisma.Decimal
  >;

  return pricesArray.reduce((currentTotals, price) => {
    // A. Encontrar a linha correspondente e a quantidade (lógica de validação)
    if (price.lineNumber === undefined || price.sequenceNumber === undefined) {
      return currentTotals; // Pula se o preço não tiver chaves de junção
    }

    const compositeKey = `${price.lineNumber}-${price.sequenceNumber}`;
    const matchingLine = linesMap.get(compositeKey);

    if (
      !matchingLine ||
      matchingLine['quantityInSalesUnitOrdered'] === undefined ||
      matchingLine['quantityInSalesUnitOrdered'] === null
    ) {
      return currentTotals; // Pula se a linha ou sua quantidade não existirem
    }

    try {
      const quantityValue = toDecimal(matchingLine['quantityInSalesUnitOrdered'] as any);

      // B. Percorrer cada chave que precisamos calcular
      for (const key of keysToCalculate) {
        const valueToMultiply = price[key];

        // C. Se o valor para esta chave específica não existir no preço, pulamos apenas este cálculo
        if (valueToMultiply !== undefined && valueToMultiply !== null) {
          try {
            const priceValue = toDecimal(valueToMultiply as any);
            const lineTotalForKey = priceValue.mul(quantityValue);

            // D. Adicionar o resultado ao total correspondente no nosso objeto acumulador
            currentTotals[key] = currentTotals[key].add(lineTotalForKey);
          } catch (conversionError) {
            // Ignora apenas esta chave se a conversão falhar, mas continua com as outras
            console.warn(`Valor inválido para a chave "${String(key)}" ignorado.`, { price, conversionError });
          }
        }
      }
    } catch (quantityError) {
      // Se a própria quantidade for inválida, pulamos o item inteiro
      console.warn(`Quantidade inválida ignorada.`, { matchingLine, quantityError });
    }

    // E. Retornar o objeto de totais atualizado para a próxima iteração
    return currentTotals;
  }, initialTotals);
}
