import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesOrderLineTextEvent } from '../../sales-order/events/sales-order-line-text.event';

@Injectable()
export class DocumentTextListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('common.created.lineText', { async: true })
  async handleDocumentCreated(event: SalesOrderLineTextEvent): Promise<void> {
    const { documentNumber, inputLines } = event;

    console.log(`[DocumentTextService] Evento recebido para o documento: ${documentNumber}`);

    const timestamps = getAuditTimestamps();
    const headerUUID = generateUUIDBuffer().slice(0);

    for (const inputLine of inputLines) {
      console.log(` -> Processar texto para a linha #${inputLine.lineNumber}: "${inputLine.text}"`);

      await this.prisma.commonText.create({
        data: {
          code: inputLine.textNumber,
          identifier3: inputLine.textNumber,
          text: inputLine.text,
          createDate: timestamps.date,
          createTime: timestamps.timeInSeconds,
          updateDate: timestamps.date,
          updateTime: timestamps.timeInSeconds,
          createDatetime: timestamps.dateTime,
          updateDatetime: timestamps.dateTime,
          singleID: headerUUID,
        },
      });
    }
  }
}
