import { Injectable } from '@nestjs/common';
import { DimensionValidationStrategy } from './dimension-strategy.interface';
import { FixtureDimensionStrategy } from './fixture-dimension.strategy';
import { GeneralDimensionStrategy } from './general-dimension.strategy';

@Injectable()
export class DimensionStrategyFactory {
  constructor(
    private readonly generalStrategy: GeneralDimensionStrategy,
    private readonly fixtureStrategy: FixtureDimensionStrategy,
  ) {}

  /**
   * Return the appropriate validation strategy array for a given dimension type.
   * @param dimensionType - The code of the dimension type (e.g., "FIX").
   * @returns An array of DimensionValidationStrategy instances.
   */
  getStrategy(dimensionType: string): DimensionValidationStrategy[] {
    const strategies: DimensionValidationStrategy[] = [this.generalStrategy];

    switch (dimensionType) {
      case 'FIX':
        strategies.push(this.fixtureStrategy);
        break;
    }

    return strategies;
  }
}
