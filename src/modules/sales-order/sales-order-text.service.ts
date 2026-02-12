import { Injectable, NotFoundException } from '@nestjs/common';
import { generateUUIDBuffer, getAuditTimestamps } from '../../common/utils/audit-date.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentTextService } from '../common/common-text.service';
import { CreateSalesOrderTextInput } from './dto/create-sales-order-text.input';
import { SalesOrderTextEntity } from './entities/sales-order-text.entity';
import { validateSalesOrderTextInput } from './helpers/sales-order-text-validation.helper';
import { mapViewToEntity } from './helpers/sales-order-text.mapper';

@Injectable()
export class SalesOrderTextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentTextService: DocumentTextService,
  ) {}

  /**
   * Retrieves a single sales order by its number, using the optimized view.
   * @param orderNumber - The sales order number to retrieve.
   * @returns The complete SalesOrderEntity or throws an error if not found.
   * @throws NotFoundException if no rows are found for the given order number.
   */
  async find(orderNumber: string): Promise<SalesOrderTextEntity> {
    const orderLinesFromView = await this.prisma.salesOrderTextView.findMany({
      where: {
        orderNumber: { equals: orderNumber },
      },
      orderBy: {
        lineNumber: 'asc',
      },
    });

    // Check if the sales order exists. If the array is empty, the order was not found.
    if (!orderLinesFromView || orderLinesFromView.length === 0) {
      throw new NotFoundException(`Sales Order with Number ${orderNumber} not found.`);
    }

    return mapViewToEntity(orderLinesFromView);
  }

  /**
   * Create or update a text for a sales order informed.
   * @param input The input data for creating or updating the sales order text.
   * @returns The created or updated sales order text entity.
   * @throws NotFoundException if the sales order does not exist.
   * @throws BadRequestException if the input data is invalid.
   */
  async create(input: CreateSalesOrderTextInput): Promise<SalesOrderTextEntity> {
    const { orderNumber, orderHeaderText, orderFooterText, lineTexts } = input;

    // Validate input and get sales order and lines data
    const { salesOrder, orderLinesData } = await validateSalesOrderTextInput(this.prisma, input);

    // Execute text creation/update in a transaction
    await this.prisma.$transaction(async (tx) => {
      let timestamps = getAuditTimestamps();
      let singleUUID = generateUUIDBuffer().slice(0);

      let headerTextKey = salesOrder.orderHeaderTextKey;
      let footerTextKey = salesOrder.orderFooterTextKey;

      // Handle header text
      if (orderHeaderText && orderHeaderText.trim() !== '') {
        if (!headerTextKey || headerTextKey.trim() === '') {
          // Generate new text number for header
          const textNumber = await this.documentTextService.getNextTextNumber(tx, 'SOH');
          headerTextKey = `SOH~${textNumber}`;
        }

        // Upsert header text in CommonText
        await tx.commonText.upsert({
          where: { code: headerTextKey },
          update: {
            text: orderHeaderText,
            updateDate: timestamps.date,
            updateTime: timestamps.timeInSeconds,
            updateDatetime: timestamps.dateTime,
          },
          create: {
            code: headerTextKey,
            identifier3: headerTextKey,
            text: orderHeaderText,
            createDate: timestamps.date,
            createTime: timestamps.timeInSeconds,
            updateDate: timestamps.date,
            updateTime: timestamps.timeInSeconds,
            createDatetime: timestamps.dateTime,
            updateDatetime: timestamps.dateTime,
            singleID: singleUUID,
          },
        });
      }

      // Handle footer text
      if (orderFooterText && orderFooterText.trim() !== '') {
        if (!footerTextKey || footerTextKey.trim() === '') {
          // Generate new text number for footer
          const textNumber = await this.documentTextService.getNextTextNumber(tx, 'SOH');
          footerTextKey = `SOH~${textNumber}`;
        }

        // Upsert footer text in CommonText
        timestamps = getAuditTimestamps();
        singleUUID = generateUUIDBuffer().slice(0);

        await tx.commonText.upsert({
          where: { code: footerTextKey },
          update: {
            text: orderFooterText,
            updateDate: timestamps.date,
            updateTime: timestamps.timeInSeconds,
            updateDatetime: timestamps.dateTime,
          },
          create: {
            code: footerTextKey,
            identifier3: footerTextKey,
            text: orderFooterText,
            createDate: timestamps.date,
            createTime: timestamps.timeInSeconds,
            updateDate: timestamps.date,
            updateTime: timestamps.timeInSeconds,
            createDatetime: timestamps.dateTime,
            updateDatetime: timestamps.dateTime,
            singleID: singleUUID,
          },
        });
      }

      // Update sales order with text keys
      if (headerTextKey !== salesOrder.orderHeaderTextKey || footerTextKey !== salesOrder.orderFooterTextKey) {
        timestamps = getAuditTimestamps();

        await tx.salesOrder.update({
          where: { orderNumber },
          data: {
            orderHeaderTextKey: headerTextKey || '',
            orderFooterTextKey: footerTextKey || '',
            updateDate: timestamps.date,
            updateDatetime: timestamps.dateTime,
          },
        });
      }

      // Handle line texts
      if (lineTexts && lineTexts.length > 0) {
        // Create a map for quick lookup of existing orderLineTextKey
        const lineDataMap = new Map(orderLinesData.map((line) => [line.lineNumber, line.orderLineTextKey]));

        for (const lineText of lineTexts) {
          if (lineText.orderLineText && lineText.orderLineText.trim() !== '') {
            let orderLineTextKey = lineDataMap.get(lineText.lineNumber);

            timestamps = getAuditTimestamps();

            if (!orderLineTextKey || orderLineTextKey.trim() === '') {
              // Generate new text number for line
              const textNumber = await this.documentTextService.getNextTextNumber(tx, 'SOQ');
              orderLineTextKey = `SOQ~${textNumber}`;

              // Update the line with new text key
              await tx.salesOrderLine.update({
                where: {
                  orderNumber_lineNumber_sequenceNumber: {
                    orderNumber: orderNumber,
                    lineNumber: lineText.lineNumber,
                    sequenceNumber: lineText.lineNumber,
                  },
                },
                data: {
                  orderLineTextKey,
                  updateDate: timestamps.date,
                  updateDatetime: timestamps.dateTime,
                },
              });
            }

            // Upsert line text in CommonText
            timestamps = getAuditTimestamps();
            singleUUID = generateUUIDBuffer().slice(0);

            await tx.commonText.upsert({
              where: { code: orderLineTextKey },
              update: {
                text: lineText.orderLineText,
                updateDate: timestamps.date,
                updateTime: timestamps.timeInSeconds,
                updateDatetime: timestamps.dateTime,
              },
              create: {
                code: orderLineTextKey,
                identifier3: orderLineTextKey,
                text: lineText.orderLineText,
                createDate: timestamps.date,
                createTime: timestamps.timeInSeconds,
                updateDate: timestamps.date,
                updateTime: timestamps.timeInSeconds,
                createDatetime: timestamps.dateTime,
                updateDatetime: timestamps.dateTime,
                singleID: singleUUID,
              },
            });
          }
        }
      }
    });

    const order = await this.find(orderNumber);

    // Return updated sales order
    return order;
  }
}
