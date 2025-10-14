import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { DimensionValidationStrategy } from './dimension-strategy.interface';
import { GeneralDimensionStrategy } from './general-dimension.strategy';

@Injectable()
export class DimensionStrategyFactory {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly dimensionConfigService: DimensionTypeConfigService,
    private readonly generalStrategy: GeneralDimensionStrategy,
  ) {}

  /**
   * Return the appropriate validation strategy array for a given dimension type.
   * @param dimensionType - The code of the dimension type (e.g., "FIX").
   * @returns An array of DimensionValidationStrategy instances.
   */
  getStrategy(dimensionType: string): DimensionValidationStrategy[] {
    const strategies: DimensionValidationStrategy[] = [this.generalStrategy];

    const config = this.dimensionConfigService.getConfigForType(dimensionType);
    const strategyClass = config?.strategyClass;

    if (strategyClass) {
      try {
        const specificStrategy = this.moduleRef.get<DimensionValidationStrategy>(strategyClass, { strict: false });
        strategies.push(specificStrategy);
      } catch (error) {
        console.warn(`Warning: No strategy provider found for token "${strategyClass}", but it was configured.`);
      }
    }

    return strategies;
  }
}
