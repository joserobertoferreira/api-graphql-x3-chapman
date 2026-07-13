import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SupplierInvoiceFilterInput } from '../dto/filter-supplier-invoice.input';

export function buildSupplierInvoiceWhereClause(
  filter?: SupplierInvoiceFilterInput,
): Prisma.SupplierInvoiceHeaderWhereInput {
  if (!filter) return {};

  const andConditions: Prisma.SupplierInvoiceHeaderWhereInput[] = [];

  if (filter.invoiceNumber_in) {
    andConditions.push({ invoiceNumber: { in: filter.invoiceNumber_in } });
  }
  if (filter.supplierCode_in) {
    andConditions.push({ billBySupplier: { in: filter.supplierCode_in } });
  }

  return { AND: andConditions };
}

/**
 * SupplierInvoiceLines has no Prisma relation to SupplierInvoiceHeader, so
 * `lines_some` filters are resolved as a manual subquery on `document`.
 */
export async function resolveLinesSomeFilterDocuments(
  prisma: PrismaService,
  filter?: SupplierInvoiceFilterInput,
): Promise<string[] | undefined> {
  if (!filter?.lines_some?.businessPartner_in) return undefined;

  const rows = await prisma.supplierInvoiceLines.findMany({
    where: { businessPartner: { in: filter.lines_some.businessPartner_in } },
    select: { document: true },
    distinct: ['document'],
  });

  return rows.map((row) => row.document);
}
