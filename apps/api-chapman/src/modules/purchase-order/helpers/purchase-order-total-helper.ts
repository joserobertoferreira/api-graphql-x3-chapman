import { Prisma } from '@prisma/client';
import { toDecimal } from '../../../common/utils/decimal.utils';

/**
 * Calcula múltiplos totais agregados, juntando informações de um array de de linhas.
 * Para cada chave fornecida em `keysToCalculate`, calcula a soma de (line[key] * line[quantity]).
 *
 * @param linesArray O array de objetos de linha (PurchaseOrderLine).
 * @param keysToCalculate Um array de chaves do objeto de linha cujos valores devem ser calculados.
 * @returns Um objeto onde cada chave é uma das `keysToCalculate` e seu valor é o total acumulado como Decimal.
 */
export function calculatePurchaseOrderTotals<K extends keyof Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput>(
  linesArray: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[],
  keysToCalculate: K[],
): Record<K, Prisma.Decimal> {
  // Pré-processar o array de linhas para uma busca O(1) usando um Map.
  const linesMap = new Map<string, Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput>();
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

  return linesArray.reduce((currentTotals, line) => {
    // A. Encontrar a linha correspondente
    if (line.lineNumber === undefined || line.sequenceNumber === undefined) {
      return currentTotals; // Pula se a linha não tiver chaves de junção
    }

    const compositeKey = `${line.lineNumber}-${line.sequenceNumber}`;
    const matchingLine = linesMap.get(compositeKey);

    if (!matchingLine) {
      return currentTotals; // Pula se a linha ou sua quantidade não existirem
    }

    try {
      // B. Percorrer cada chave que precisamos calcular
      for (const key of keysToCalculate) {
        const valueToMultiply = line[key];

        // C. Se o valor para esta chave específica não existir na linha, pulamos apenas este cálculo
        if (valueToMultiply !== undefined && valueToMultiply !== null) {
          try {
            const lineValue = toDecimal(valueToMultiply as any);

            // D. Adicionar o resultado ao total correspondente no nosso objeto acumulador
            currentTotals[key] = currentTotals[key].add(lineValue);
          } catch (conversionError) {
            // Ignora apenas esta chave se a conversão falhar, mas continua com as outras
            console.warn(`Valor inválido para a chave "${String(key)}" ignorado.`, { line, conversionError });
          }
        }
      }
    } catch (error) {
      console.warn(`Erro ao calcular totais.`, { error });
    }
    // E. Retornar o objeto de totais atualizado para a próxima iteração
    return currentTotals;
  }, initialTotals);
}

/**
 * Acumula ou adiciona um valor de imposto a um array de linhas de impostos.
 * Esta função modifica o array original
 *
 * @param taxLines - O array de linhas de impostos a ser modificado.
 * @param vatCode - O código do imposto (VAT) a ser procurado (corresponde ao campo `taxes`).
 * @param baseToAdd - A base de cálculo a ser somada ao `taxBasis`.
 * @param amountToAdd - O valor a ser somado ao `taxAmount`.
 * @param rate - A taxa de imposto a ser aplicada.
 */
export function accumulateOrAddTax(
  taxLines: Prisma.PurchaseDocumentsFooterUncheckedCreateInput[],
  vatCode: string,
  baseToAdd: Prisma.Decimal,
  amountToAdd: Prisma.Decimal,
  rate: Prisma.Decimal,
): void {
  // A função não precisa retornar nada, pois modifica o array diretamente.

  // 1. Converte o valor a ser adicionado para um objeto Decimal para cálculos seguros.
  const baseDecimal = new Prisma.Decimal(baseToAdd);
  const amountDecimal = new Prisma.Decimal(amountToAdd);

  // 2. Procura por uma linha existente com o mesmo código de imposto.
  const existingTaxLine = taxLines.find((line) => line.taxes === vatCode);

  if (existingTaxLine) {
    // Converte o `taxBasis` existente para Decimal para fazer a soma.
    const currentBasis = toDecimal(existingTaxLine.taxBasis as any);

    // Converte o `taxAmount` existente para Decimal para fazer a soma.
    const currentAmount = toDecimal(existingTaxLine.taxAmount as any);

    // Acumula o novo valor.
    existingTaxLine.taxBasis = currentBasis.add(baseDecimal);
    existingTaxLine.taxAmount = currentAmount.add(amountDecimal);

    console.log(`Imposto '${vatCode}' encontrado. Novo valor acumulado: ${existingTaxLine.taxAmount}`);
  } else {
    // Cria uma nova linha de imposto.
    const newTaxLine: Prisma.PurchaseDocumentsFooterUncheckedCreateInput = {
      taxes: vatCode,
      taxBasis: baseDecimal,
      taxAmount: amountDecimal,
      rate: new Prisma.Decimal(rate),
    };

    // Adiciona a nova linha ao array.
    taxLines.push(newTaxLine);

    console.log(`Imposto '${vatCode}' não encontrado. Adicionando nova linha com valor: ${amountDecimal}`);
  }
}
