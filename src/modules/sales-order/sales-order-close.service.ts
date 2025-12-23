import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloseSalesOrderLineInput } from './dto/close-sales-order-line.input';
import { ClosedSalesOrderEntity } from './entities/sales-order.entity';
import { mapOrderToClosedEntity } from './helpers/sales-order.mapper';

const salesOrderLineInclude = {
  price: true,
} satisfies Prisma.SalesOrderLineInclude;

@Injectable()
export class SalesOrderCloseService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Closes the sales order line and updates the order status.
   * If specific line numbers are provided, it closes only those lines.
   * If no line numbers are provided, it closes ALL eligible lines for the order.
   *
   * @param input Object containing the order number and an optional array of line numbers.
   * @returns Promise<SalesOrderLineEntity> The updated sales order with the closed lines.
   */
  async closeSalesOrderLines(input: CloseSalesOrderLineInput): Promise<ClosedSalesOrderEntity> {
    const { orderNumber, lines: lineNumbers } = input;

    // Fetch the order to check its status
    const orderOk = await this.prisma.salesOrder.findUnique({
      where: { orderNumber: orderNumber },
      select: { orderStatus: true, accountingValidationStatus: true },
    });

    if (!orderOk) {
      throw new NotFoundException(`Sales Order with number ${orderNumber} not found.`);
    }
    if (orderOk.orderStatus !== 1) {
      throw new BadRequestException(
        `Sales Order ${orderNumber} is not in a state that allows cancellation (status is not 'Open').`,
      );
    }
    if (orderOk.accountingValidationStatus !== 2) {
      throw new BadRequestException('Accounting Order status does not allow cancellation.');
    }

    // Check target lines exist and are eligible for closing
    let targetLines: { lineNumber: number; lineStatus: number; accountingValidationStatus: number }[];
    const hasSpecificLines = lineNumbers && lineNumbers.length > 0;

    if (hasSpecificLines) {
      // Specific lines provided, validate their existence and status
      targetLines = await this.prisma.salesOrderLine.findMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: lineNumbers },
        },
        select: { lineNumber: true, lineStatus: true, accountingValidationStatus: true },
      });

      if (targetLines.length !== lineNumbers.length) {
        const found = new Set(targetLines.map((l) => l.lineNumber));
        const missing = lineNumbers.filter((n) => !found.has(n));
        throw new NotFoundException(`Sales Order Lines not found for order ${orderNumber}: ${missing.join(', ')}.`);
      }

      // Check if any line is already closed
      const alreadyClosedLines = targetLines.filter((line) => line.lineStatus === 3);
      if (alreadyClosedLines.length > 0) {
        const closedLineNumbers = alreadyClosedLines.map((line) => line.lineNumber);
        throw new BadRequestException(
          `Sales Order Lines already closed for order number ${orderNumber} and lines: ${closedLineNumbers.join(
            ', ',
          )}.`,
        );
      }

      // Check if any line is eligible for closing
      const invalidAccountingLines = targetLines.filter((line) => line.accountingValidationStatus !== 2);
      if (invalidAccountingLines.length > 0) {
        const invalidLineNumbers = invalidAccountingLines.map((line) => line.lineNumber);
        throw new BadRequestException(
          `Sales Order Lines not allowed to be closed for order number ${orderNumber} and
            lines: ${invalidLineNumbers.join(', ')}.`,
        );
      }
    } else {
      // Check if all lines are eligible for closing
      targetLines = await this.prisma.salesOrderLine.findMany({
        where: {
          orderNumber: orderNumber,
          lineStatus: 1,
          accountingValidationStatus: 2,
        },
        select: { lineNumber: true, lineStatus: true, accountingValidationStatus: true },
      });

      if (targetLines.length === 0) {
        throw new BadRequestException(`No open lines found for Sales Order ${orderNumber} to close.`);
      }
    }

    const targetLineNumbers = targetLines.map((l) => l.lineNumber);

    const updatedLines = await this.prisma.$transaction(async (tx) => {
      // Updates the status of the sales order line
      await tx.salesOrderLine.updateMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: targetLineNumbers },
        },
        data: {
          lineStatus: 3,
          accountingValidationStatus: 1,
        },
      });

      // Updates the order status if all lines are closed
      const remainingLines = await tx.salesOrderLine.count({
        where: {
          orderNumber: orderNumber,
          lineStatus: {
            equals: 1,
          },
        },
      });

      if (remainingLines === 0) {
        await tx.salesOrder.update({
          where: { orderNumber: orderNumber },
          data: { orderStatus: 2, accountingValidationStatus: 1 },
        });
      } else {
        await tx.salesOrder.update({
          where: { orderNumber: orderNumber },
          data: { accountingValidationStatus: 1 },
        });
      }

      // Fetch the complete data for the updated lines
      const committedLines = await tx.salesOrderLine.findMany({
        where: {
          orderNumber: orderNumber,
          lineNumber: { in: targetLineNumbers },
        },
        include: salesOrderLineInclude,
      });

      const analyticalLines = await tx.analyticalAccountingLines.findMany({
        where: {
          document: orderNumber,
          lineNumber: { in: targetLineNumbers },
        },
      });

      return { committedLines, analyticalLines };
    });

    const order = await this.prisma.salesOrder.findUnique({
      where: { orderNumber: orderNumber },
    });

    const analyticalLinesMap = new Map<number, any[]>();
    for (const analyticLine of updatedLines.analyticalLines) {
      const lineNumber = analyticLine.lineNumber;
      if (!analyticalLinesMap.has(lineNumber)) {
        analyticalLinesMap.set(lineNumber, []);
      }
      analyticalLinesMap.get(lineNumber)!.push(analyticLine);
    }

    const linesWithAnalytics = updatedLines.committedLines.map((line) => ({
      ...line,
      analyticalLines: analyticalLinesMap.get(line.lineNumber) || [],
    }));

    return mapOrderToClosedEntity(order!, linesWithAnalytics);
  }
}
