import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ValidatedSalesOrderTextContext } from '../../../common/types/sales-order.types';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSalesOrderTextInput } from '../dto/create-sales-order-text.input';

/**
 * Validates all input data for sales order text operations
 * @param prisma Prisma service instance
 * @param input Input data to validate
 * @returns Validated context with sales order and lines data
 * @throws NotFoundException if sales order doesn't exist
 * @throws BadRequestException if input validation fails
 */
export async function validateSalesOrderTextInput(
  prisma: PrismaService,
  input: CreateSalesOrderTextInput,
): Promise<ValidatedSalesOrderTextContext> {
  const { orderNumber, orderHeaderText, orderFooterText, lineTexts } = input;

  // 1. Check if the sales order exists
  const salesOrder = await prisma.salesOrder.findUnique({
    where: { orderNumber },
    select: {
      orderNumber: true,
      orderHeaderTextKey: true,
      orderFooterTextKey: true,
    },
  });

  if (!salesOrder) {
    throw new NotFoundException(`Sales order with number ${orderNumber} not found.`);
  }

  // 2. Validate header text (if provided, cannot be empty)
  if (orderHeaderText !== undefined) {
    if (typeof orderHeaderText !== 'string') {
      throw new BadRequestException('Order header text must be a string.');
    }
    if (orderHeaderText.trim() === '') {
      throw new BadRequestException('Order header text cannot be empty when provided.');
    }
  }

  // 3. Validate footer text (if provided, cannot be empty)
  if (orderFooterText !== undefined) {
    if (typeof orderFooterText !== 'string') {
      throw new BadRequestException('Order footer text must be a string.');
    }
    if (orderFooterText.trim() === '') {
      throw new BadRequestException('Order footer text cannot be empty when provided.');
    }
  }

  // 4. Validate line texts and check if lines exist
  let orderLinesData: { lineNumber: number; orderLineTextKey: string }[] = [];

  if (lineTexts && lineTexts.length > 0) {
    // Validate each line text
    for (const lineText of lineTexts) {
      if (typeof lineText.lineNumber !== 'number') {
        throw new BadRequestException('Line number must be a number.');
      }
      if (typeof lineText.orderLineText !== 'string') {
        throw new BadRequestException('Order line text must be a string.');
      }
      if (lineText.orderLineText.trim() === '') {
        throw new BadRequestException(`Order line text for line ${lineText.lineNumber} cannot be empty when provided.`);
      }
    }

    // Check if lines exist and get their orderLineTextKey values
    const lineNumbers = lineTexts.map((line) => line.lineNumber);
    const uniqueLineNumbers = [...new Set(lineNumbers)];

    const existingLines = await prisma.salesOrderLine.findMany({
      where: {
        orderNumber: orderNumber,
        lineNumber: {
          in: uniqueLineNumbers,
        },
      },
      select: {
        lineNumber: true,
        orderLineTextKey: true,
      },
    });

    const existingLineNumbers = new Set(existingLines.map((line) => line.lineNumber));
    const missingLineNumbers = uniqueLineNumbers.filter((lineNumber) => !existingLineNumbers.has(lineNumber));

    if (missingLineNumbers.length > 0) {
      throw new BadRequestException(
        `The following line numbers do not exist for order ${orderNumber}: ${missingLineNumbers.join(', ')}`,
      );
    }

    orderLinesData = existingLines;
  }

  return {
    salesOrder,
    orderLinesData,
  };
}
