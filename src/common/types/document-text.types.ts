// Interfaces

/**
 * Represents any document created in the database that has lines.
 */
export interface ICreateDocumentLineText {
  textNumber: string;
  lineNumber: number;
  text: string;
}

export interface ICreatedDocumentWithLines {
  documentNumber: string;
  documentLines: ICreateDocumentLineText[];
}
