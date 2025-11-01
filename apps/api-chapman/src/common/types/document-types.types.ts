import { Prisma } from 'src/generated/prisma';

// Interfaces

/**
 * Interface definition to build the arguments for fetching document types.
 */
export interface FindDocumentTypeArgs {
  where?: Prisma.DocumentTypesWhereInput;
  orderBy?: Prisma.DocumentTypesOrderByWithRelationInput;
  skip?: number;
  take?: number;
  select?: Prisma.DocumentTypesSelect;
}

/**
 * Interface definition to build the arguments for fetching a single, unique document type.
 */
export interface FindUniqueDocumentTypeArgs {
  /**
   * The unique identifier to find the document type.
   * Typically 'code' or another @unique field.
   */
  where?: Prisma.DocumentTypesWhereUniqueInput;

  /**
   * Optionally, select a subset of fields from the document type.
   * Cannot be used with 'include'.
   */
  select?: Prisma.DocumentTypesSelect;
}

/**
 * Interface definition to build the arguments for fetching the first document type
 * that matches the given criteria.
 */
export interface FindFirstDocumentTypeArgs {
  /**
   * Filter conditions to apply.
   */
  where?: Prisma.DocumentTypesWhereInput;

  /**
   * Fields to sort by, which determines which record is "first".
   */
  orderBy?: Prisma.DocumentTypesOrderByWithRelationInput;

  /**
   * Optionally, select a subset of fields.
   */
  select?: Prisma.DocumentTypesSelect;

  // /**
  //  * Optionally, include related records.
  //  */
  // include?: Prisma.DocumentTypesInclude;

  /**
   * A unique identifier for the cursor to use for pagination.
   */
  cursor?: Prisma.DocumentTypesWhereUniqueInput;

  /**
   * The number of records to skip before starting to count.
   */
  skip?: number;

  /**
   * A set of distinct fields to consider for the query.
   */
  distinct?: Prisma.DocumentTypesScalarFieldEnum | Prisma.DocumentTypesScalarFieldEnum[];
}
