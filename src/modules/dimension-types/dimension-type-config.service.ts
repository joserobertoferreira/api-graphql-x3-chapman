import { Injectable, OnModuleInit } from '@nestjs/common';
import { DimensionTypeConfig } from '../../common/types/dimension.types';
import { capitalize } from '../../common/utils/common.utils';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DimensionTypeConfigService implements OnModuleInit {
  // The map will be stored here, in memory.
  private dtoFieldToTypeMap: Map<string, DimensionTypeConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * This method is called automatically by NestJS when the module initializes.
   */
  async onModuleInit() {
    console.log('Loading dimension configuration into memory...');
    await this.loadDimensionConfig();
  }

  /**
   * Fetches the dimension types from the database and builds the map.
   */
  async loadDimensionConfig() {
    const dimensionTypes = await this.prisma.dimensionsTypeView.findMany({
      select: {
        code: true, // ex: 'FIX'
        description: true, // ex: '1. Fixture '
      },
    });

    const tempMap = new Map<string, DimensionTypeConfig>();
    for (const type of dimensionTypes) {
      // Logic to extract the DTO field name from the description
      // Ex: "1. Fixture " -> "fixture"
      const fieldName = type.description.split('.')[1]?.trim().toLowerCase();
      const typeCode = type.code;
      const strategy = capitalize(fieldName || '') + 'DimensionStrategy';
      const stringPosition = type.description.split('.')[0]?.trim();
      const fieldNumber = parseInt(stringPosition, 10);

      if (fieldName && typeCode) {
        tempMap.set(fieldName, {
          code: typeCode,
          description: type.description,
          strategyClass: strategy, // Set the strategy class as needed
          isMandatory: false, // Default to false; can be updated later if needed
          fieldNumber: fieldNumber,
        });
      }
    }

    this.dtoFieldToTypeMap = tempMap;
    console.log('Dimension configuration loaded:', this.dtoFieldToTypeMap);
  }

  /**
   * Return the complete configuration map.
   */
  public getDtoFieldToTypeMap(): Map<string, DimensionTypeConfig> {
    return this.dtoFieldToTypeMap;
  }

  /**
   * Return the configuration for a specific dimension type.
   * @param dimensionType - The code of the dimension type (e.g., "FIX").
   * @returns The DimensionTypeConfig object or undefined if not found.
   */
  public getConfigForType(dimensionType: string): DimensionTypeConfig | undefined {
    for (const config of this.dtoFieldToTypeMap.values()) {
      if (config.code === dimensionType) {
        return config;
      }
    }
    return undefined;
  }
}
