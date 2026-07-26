import { BadRequestException, Injectable } from '@nestjs/common';
import { PurchaseInvoiceType } from '../../generated/prisma/client';
import { CommonService } from '../../modules/common/common.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ParametersService } from '../parameters/parameter.service';
import { DEFAULT_LEGACY_DATE } from '../types/common.types';
import { CompanyModel, companyModelSelect } from '../types/company.types';
import { SiteModel, siteModelSelect } from '../types/site.types';
import { SupplierInvoiceDatesInfo } from '../types/supplier-invoice.types';
import { convertStringToDate, getYearAndMonth, isDateInRange, YearMonth } from '../utils/date.utils';
import { LocalMenus } from '../utils/enums/local-menu';
import { AccountService } from './account.service';

@Injectable()
export class CommonSupplierInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly accountService: AccountService,
    private readonly commonService: CommonService,
  ) {}

  /**
   * Retrieves the company accounting model and validates the provided invoice type
   * against the company's legislation, plus the site's membership in the invoice
   * type's site group, when one is defined.
   *
   * @param companyCode - The unique code identifying the company.
   * @param invoiceTypeCode - (Optional) The code of the invoice type to validate.
   * @param site - The site code from the supplier invoice header.
   * @returns An object containing the company model and a invoice type model.
   * @throws BadRequestException If the company model is not found, the invoice type is invalid for the
   * legislation, or the site does not belong to the invoice type's site group.
   */
  async getCompanyAndInvoiceType(companyCode: string, invoiceTypeCode: string, site: string) {
    // Get the accounting model from company
    const companyModel: CompanyModel | null = await this.prisma.company.findUnique({
      where: { company: companyCode },
      select: companyModelSelect,
    });

    if (!companyModel) {
      throw new BadRequestException(`Accounting model for company ${companyCode} not found.`);
    }

    // Get dimensions and flags from site
    const siteModel: SiteModel | null = await this.prisma.site.findUnique({
      where: { siteCode: site },
      select: siteModelSelect,
    });

    if (!siteModel) {
      throw new BadRequestException(`Site ${site} model for company ${companyCode} not found.`);
    }

    const invoiceTypeIsValid = await this.accountService.getPurchaseInvoiceType({
      where: { code: invoiceTypeCode, legislation: companyModel.legislation },
    });

    if (!invoiceTypeIsValid) {
      throw new BadRequestException(
        `Invoice type ${invoiceTypeCode} is not valid for legislation ${companyModel.legislation} or not found.`,
      );
    }

    const group = invoiceTypeIsValid.group?.trim();

    if (group) {
      const groupExists = await this.prisma.siteGroups.findUnique({ where: { group } });

      if (!groupExists) {
        throw new BadRequestException(`Site group ${group} defined for invoice type ${invoiceTypeCode} not found.`);
      }

      const siteInGroup = await this.prisma.siteGrouping.count({ where: { company: group, site } });

      if (siteInGroup === 0) {
        throw new BadRequestException(`Site ${site} does not belong to site group ${group}.`);
      }
    }

    return { companyModel, siteModel, invoiceTypeIsValid };
  }

  /**
   * Retrieves and validate the provided document type code.
   *
   * @param documentTypeCode The code of the document type to validate.
   * @param legislation The legislation according to company
   * @returns A documentType model.
   * @throws BadRequestException If the document type is invalid for the legislation.
   */
  async getDocumentType(documentTypeCode: string, legislation: string) {
    // Check if the document type informed is valid
    const documentTypeIsValid = await this.accountService.getDocumentType({
      where: { documentType: documentTypeCode, legislation: legislation },
    });

    if (!documentTypeIsValid) {
      throw new BadRequestException(
        `Document type ${documentTypeCode} is not valid for legislation ${legislation} or not found.`,
      );
    }

    return documentTypeIsValid;
  }

  /**
   * Control of the exercise and period + validity dates
   * @param accountingDate - The accounting date to validate.
   * @param company - The company associated with the supplier invoice.
   * @param invoiceType - The invoice type associated with the supplier invoice.
   * @returns An object containing the accounting date, fiscal year, and period.
   * @throws BadRequestException if validation fails.
   */
  async validateAccountingDate(
    accountingDate: Date,
    company: string,
    invoiceType: PurchaseInvoiceType,
  ): Promise<SupplierInvoiceDatesInfo> {
    // Determine the fiscal year and period based on the accounting date
    const fiscalYear = await this.commonService.getFiscalYear(
      company,
      LocalMenus.LedgerType.LEGAL,
      accountingDate.getFullYear(),
    );

    if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
      throw new BadRequestException('Fiscal year or its properties are missing.');
    }
    const enumFiscalYearStatus: LocalMenus.FiscalYearReport = fiscalYear.status;

    if (enumFiscalYearStatus === LocalMenus.FiscalYearReport.CLOSED) {
      throw new BadRequestException(`Fiscal year ${fiscalYear.code} is closed.`);
    }
    if (enumFiscalYearStatus !== LocalMenus.FiscalYearReport.OPEN) {
      throw new BadRequestException(`Fiscal year ${fiscalYear.code} is not open.`);
    }

    const yearMonth: YearMonth = getYearAndMonth(accountingDate);

    const period = await this.commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);
    if (!period) {
      throw new BadRequestException(`Period for ${yearMonth.year}-${yearMonth.month} not found.`);
    }
    const enumPeriodStatus: LocalMenus.FiscalYearPeriodStatus = period.status;

    if (enumPeriodStatus === LocalMenus.FiscalYearPeriodStatus.CLOSED) {
      throw new BadRequestException(`Period ${period.code} is closed.`);
    }
    if (
      enumPeriodStatus < LocalMenus.FiscalYearPeriodStatus.OPEN ||
      enumPeriodStatus > LocalMenus.FiscalYearPeriodStatus.CLOSED
    ) {
      throw new BadRequestException(`Period ${period.code} is not open.`);
    }

    // Check if the accounting date is within module open and close dates
    const moduleInfo = await this.commonService.getObjectInformation('GAS');
    if (moduleInfo && moduleInfo.module !== 3) {
      if (moduleInfo.module === 2) {
        // Get the close operations dates
        const accountingStartDate = await this.parametersService.getParameterValue(
          invoiceType.legislation,
          '',
          company,
          'CPTSTRDAT',
        );
        const accountingEndDate = await this.parametersService.getParameterValue(
          invoiceType.legislation,
          '',
          company,
          'CPTENDDAT',
        );

        if (!accountingStartDate || !accountingEndDate) {
          throw new BadRequestException(`Accounting start or end date is not defined.`);
        }
        const startDate = convertStringToDate(accountingStartDate.value) ?? DEFAULT_LEGACY_DATE;
        const endDate = convertStringToDate(accountingEndDate.value) ?? DEFAULT_LEGACY_DATE;
        const dateOK = isDateInRange(accountingDate, startDate, endDate);
        if (!dateOK) {
          throw new BadRequestException(`Date prohibited for the module Financial.`);
        }
      }
    }

    return { accountingDate, fiscalYear: fiscalYear.code, period: period.code };
  }
}
