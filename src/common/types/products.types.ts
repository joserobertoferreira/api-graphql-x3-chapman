// Interfaces

/**
 * Interface definition for product validation.
 */
export interface ProductValidation {
  code: string;
  taxLevelCode?: string;
  grossPrice?: number;
  legislation?: string;
  taxRule?: string;
}
