/**
 * Retrieves the company accounting model and validates the provided invoice type
 * against the company's legislation.
 *
 * TODO: Depois de eu saber o que a tabela realmente guarda, decidir se isso fica
 * SÓ checando existência (então isso vira um `boolean`/lookup simples), ou se
 * também precisa validar coisas tipo:
 *   - rateType padrão de câmbio (equivalente a documentType.rateType)
 *   - datas de vigência (validFrom / validUntil)
 *   - contador de sequência associado (se não for o próprio invoiceType)
 *   - se gera open item (equivalente a documentType.openItemType)
 */
async getCompanyAndInvoiceType(companyCode: string, invoiceTypeCode: string) {
  const companyModel: CompanyModel | null = await this.prisma.company.findUnique({
    where: { company: companyCode },
    select: companyModelSelect,
  });

  if (!companyModel) {
    throw new BadRequestException(`Accounting model for company ${companyCode} not found.`);
  }

  // TODO: trocar getDocumentType por getSupplierInvoiceType quando o model estiver confirmado
  const invoiceTypeIsValid = await this.accountService.getSupplierInvoiceType({
    where: { invoiceType: invoiceTypeCode, legislation: companyModel.legislation },
  });

  if (!invoiceTypeIsValid) {
    throw new BadRequestException(
      `Invoice type ${invoiceTypeCode} is not valid for legislation ${companyModel.legislation} or not found.`,
    );
  }

  return { companyModel, invoiceTypeIsValid };
}
