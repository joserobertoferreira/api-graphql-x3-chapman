import { PurchaseOrderView, SalesOrderView } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersDimensionDetail } from '../types/dimension.types';

/**
 * Build a dimension object for orders response.
 * @ param lines - Array of order lines (SalesOrderView or PurchaseOrderView)
 * @ param prisma - PrismaService instance for database access
 * @ returns void (the function modifies the lines in place)
 */
export async function buildOrderDimensionResponse(
  lines: SalesOrderView[] | PurchaseOrderView[],
  prisma: PrismaService,
): Promise<Map<string, OrdersDimensionDetail>> {
  // Collect dimension types and values for further processing if needed
  const dimensionsSearch = new Map<string, { dimensionType: string; dimension: string }>();

  for (const line of lines) {
    const analytics = (line as any).analyticalAccountingLines?.[0];

    if (analytics) {
      for (let i = 1; i <= 20; i++) {
        const typeKey = `dimensionType${i}` as keyof typeof analytics;
        const valueKey = `dimension${i}` as keyof typeof analytics;

        const typeCode = analytics[typeKey] as string;
        const value = analytics[valueKey] as string;

        if (!typeCode || typeCode.trim() === '') {
          break;
        }

        dimensionsSearch.set(`${typeCode}|${value}`, {
          dimensionType: typeCode,
          dimension: value || '',
        });
      }
    }
  }

  // Fetch additional dimension details if necessary
  const pairsToFetch = Array.from(dimensionsSearch.values());
  const dimensionDetails =
    pairsToFetch.length > 0
      ? await prisma.dimensions.findMany({
          where: { OR: pairsToFetch },
          select: {
            dimensionType: true,
            dimension: true,
            translatableDescription: true, // 'additionalInfo'
            shortDescription: true, // 'shortTitle'
            pioneerReference: true,
            fixtureCustomer: true,
            brokerEmail: true,
          },
        })
      : [];

  // Collect all fixtureCustomer codes to fetch their names in a single query
  const fixtureCustomerCodes = [
    ...new Set(dimensionDetails.map((d) => d.fixtureCustomer).filter((code): code is string => !!code)),
  ];

  // Fetch fixture customer names in a single query
  const fixtureCustomersData =
    fixtureCustomerCodes.length > 0
      ? await prisma.customer.findMany({
          where: { customerCode: { in: fixtureCustomerCodes } },
          select: { customerCode: true, customerName: true },
        })
      : [];

  const fixtureCustomerMap = new Map<string, string>(
    fixtureCustomersData.map((fc) => [fc.customerCode, fc.customerName]),
  );

  // Data structure to hold dimension details for quick access
  const dimensionsData = new Map<string, OrdersDimensionDetail>(
    dimensionDetails.map((d) => {
      const key = `${d.dimensionType}|${d.dimension}`;

      const fixtureCustomerObj = d.fixtureCustomer
        ? { code: d.fixtureCustomer.trim(), name: fixtureCustomerMap.get(d.fixtureCustomer)?.trim() || '' }
        : undefined;

      const value: OrdersDimensionDetail = {
        dimensionType: d.dimensionType,
        dimension: d.dimension.trim() || '',
        shortTitle: d.shortDescription.trim() || '',
        additionalInfo: d.translatableDescription.trim() || '',
        pioneerReference: d.pioneerReference.trim() || '',
        fixtureCustomer: fixtureCustomerObj,
        brokerEmail: d.brokerEmail.trim() || '',
      };

      return [key, value];
    }),
  );

  return dimensionsData;
}
