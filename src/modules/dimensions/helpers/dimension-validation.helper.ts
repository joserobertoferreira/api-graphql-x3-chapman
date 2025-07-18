import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommonService } from '../../../common/services/common.service';
import { DimensionsValidator } from '../../../common/validators/dimensions.validator';
import { CompanyService } from '../../companies/company.service';
import { CustomerService } from '../../customers/customer.service';
import { DimensionTypeService } from '../../dimension-types/dimension-type.service';
import { DimensionInput } from '../../sales-order/dto/dimension.input';
import { SiteService } from '../../sites/site.service';
import { CreateDimensionInput } from '../dto/create-dimension.input';

/**
 * Executa a validação de uma nova dimensão antes de sua criação.
 * @param input - O DTO vindo da mutation do GraphQL.
 * @param dimensionTypeService - Serviço de tipos de dimensão para verificar a existência.
 * @param dimensionsValidator - Validador de dimensões para validar outras dimensões.
 * @param customerService - Serviço de clientes para verificar a existência do cliente.
 * @param siteService - Serviço de sites para verificar a existência do site.
 * @param companyService - Serviço de empresas para verificar a existência da empresa.
 * @param commonService - Serviço comum para operações auxiliares.
 * @throws ConflictException se a dimensão já existir.
 * @throws NotFoundException se o tipo de dimensão não existir.
 * @returns void
 */
export async function validateNewDimension(
  input: CreateDimensionInput,
  dimensionTypeService: DimensionTypeService,
  dimensionsValidator: DimensionsValidator,
  customerService: CustomerService,
  siteService: SiteService,
  companyService: CompanyService,
  commonService: CommonService,
): Promise<string> {
  let groupCompany: string = '';

  // 2. Verificar se o tipo de dimensão principal existe
  const dimensionTypeExists = await dimensionTypeService.exists(input.dimensionType);
  if (!dimensionTypeExists) {
    throw new NotFoundException(`Dimension Type "${input.dimensionType}" does not exist.`);
  }

  // 3. Se Company/Site/Group foi enviado, verificar se existe
  if (input.site) {
    const siteExists = await siteService.exists(input.site);
    if (!siteExists) {
      // Procurar por uma sociedade com o código fornecido
      const companyExists = await companyService.exists(input.site);
      if (!companyExists) {
        // Procurar por um grupo de empresas com o código fornecido
        const groupExists = await commonService.companyGroupExists(input.site);
        if (!groupExists) {
          // Se nenhum dos três existir, lançar uma exceção
          throw new NotFoundException(`Company/Site/Group with code "${input.site}" does not exist.`);
        } else {
          groupCompany = 'group';
        }
      } else {
        groupCompany = 'company';
      }
    } else {
      groupCompany = 'site';
    }
  }

  // 4. Se a dimensão for FIX, verificar dados obrigatórios
  if (input.dimensionType === 'FIX') {
    if (!input.customerCode) {
      throw new BadRequestException('Fixture Customer Code is required for FIX dimension type.');
    }
    const fixtureErrors = await validateFixtureData(
      customerService,
      input.customerCode,
      input.description,
      input.flightDate,
      input.originDestination,
      input.flightReferenceId,
    );

    if (fixtureErrors.length > 0) {
      throw new BadRequestException({ message: 'Fixture data validation failed', errors: fixtureErrors });
    }
  } else if (!input.description || input.description.trim() === '') {
    // Se não for FIX, a descrição é obrigatória
    throw new BadRequestException('Description is required.');
  }

  // 5. Se a dimensão for BRK, verificar dados obrigatórios
  if (input.dimensionType === 'BRK') {
    if (input.dimension.length > 4) {
      throw new BadRequestException('Dimension length must be 4 characters for BRK dimension type.');
    }
    if (!input.brokerEmail) {
      throw new BadRequestException('Broker Email is required for BRK dimension type.');
    }
  }

  // 6. Se enviadas outras dimensões verificar se existem
  if (input.otherDimensions && input.otherDimensions.length > 0) {
    const dimensionsToValidate: DimensionInput[] = input.otherDimensions.map((d) => ({
      typeCode: d.dimensionType,
      value: d.dimension,
    }));
    const dimensionsOk = await dimensionsValidator.validate(dimensionsToValidate);

    if (!dimensionsOk) {
      throw new BadRequestException(dimensionsValidator.defaultMessage());
    }
  }

  return groupCompany;
}

/**
 * Faz a validação para os dados de uma fixture.
 * @param customerService - Serviço de clientes para verificar a existência do cliente.
 * @param customerCode - Código do cliente.
 * @param description - Descrição da dimensão.
 * @param flightDate - Data do voo.
 * @param originDestination - Origem e destino do voo.
 * @param flightReferenceId - ID de referência do voo.
 */
async function validateFixtureData(
  customerService: CustomerService,
  customerCode: string,
  description: string | undefined,
  flightDate: Date | undefined,
  originDestination: string | undefined,
  flightReferenceId: string | undefined,
): Promise<string[]> {
  const errors: string[] = [];

  const customer = await customerService.exists(customerCode);
  if (!customer) {
    errors.push('Customer code does not exist.');
  }
  // if (!description || description.trim() === '') {
  //   errors.push('Description is required for FIX dimension type.');
  // }
  if (!flightDate) {
    errors.push('Flight date is required for FIX dimension type.');
  }
  if (!originDestination) {
    errors.push('Origin - Destination is required for FIX dimension type.');
  }
  if (!flightReferenceId) {
    errors.push('Flight Reference ID is required for FIX dimension type.');
  }

  return errors;
}
