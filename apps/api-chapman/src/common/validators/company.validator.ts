import { Injectable } from '@nestjs/common';
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Prisma } from 'src/generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

export interface IsValidSiteArgs {
  company?: string;
}

@ValidatorConstraint({ name: 'companyValidator', async: true })
@Injectable()
export class CompanyValidator implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(company: string, args?: ValidationArguments): Promise<boolean> {
    if (!company) {
      return true;
    }

    return await this.prisma.company
      .findUnique({ where: { company: company } })
      .then((company) => !!company)
      .catch(() => false);
  }

  defaultMessage?(args?: ValidationArguments): string {
    return 'Company does not exist';
  }
}

@ValidatorConstraint({ name: 'companySiteValidator', async: true })
@Injectable()
export class CompanySiteValidator implements ValidatorConstraintInterface {
  constructor(private readonly prisma: PrismaService) {}

  async validate(site: string, args?: ValidationArguments): Promise<boolean> {
    if (!site) {
      return true;
    }

    const options: IsValidSiteArgs = args?.constraints[0] || {};

    const where: Prisma.SiteWhereInput = { siteCode: site };

    if (options.company) {
      const company = (args?.object as any)[options.company];

      if (company) {
        where.legalCompany = { equals: company };
      } else {
        return false;
      }
    }

    const count = await this.prisma.site.count({ where: where });
    return count > 0;
  }

  defaultMessage?(args: ValidationArguments): string {
    const options: IsValidSiteArgs = args.constraints[0] || {};
    const siteCode = args.value;

    if (options.company) {
      const companyCode = (args.object as any)[options.company];
      return `Site with code "${siteCode}" does not exist or does not belong to company "${companyCode}".`;
    }

    return `Site with code "${siteCode}" does not exist.`;
  }
}
