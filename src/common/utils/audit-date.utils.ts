import { parse as uuidParse, v4 as uuidv4 } from 'uuid';

/**
 * Interface para o objeto de retorno da função getAuditTimestamps.
 */
export interface AuditTimestamps {
  /**
   * Um objeto Date completo, representando o ponto exato no tempo (data e hora).
   * Ideal para campos DATETIME.
   */
  dateTime: Date;
  /**
   * Uma string no formato ISO 'YYYY-MM-DD', representando apenas a data.
   * Ideal para campos DATE.
   */
  date: Date;
}

/**
 * Gera carimbos de data e hora consistentes para operações de auditoria.
 * Retorna tanto um objeto Date completo (para campos datetime) quanto uma string
 * de data ISO 'YYYY-MM-DD' (para campos de apenas data).
 *
 * @returns {AuditTimestamps} Um objeto contendo a data e a data/hora atuais.
 */
export function getAuditTimestamps(): AuditTimestamps {
  const now = new Date();

  // Cria um novo objeto Date que representa o início do dia (meia-noite) em UTC
  const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return {
    dateTime: now,
    date: startOfDayUTC,
  };
}

/**
 * Calcula o número total de segundos desde a meia-noite (00:00:00) em UTC
 * para um determinado objeto Date.
 * Usar UTC garante que o resultado seja consistente e independente do fuso horário do servidor.
 *
 * @param date - O objeto Date a ser convertido.
 * @returns O número de segundos desde a meia-noite UTC.
 */
export function getSeconds(date: Date): number {
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Gera um UUID v4 e o retorna como um Buffer de 16 bytes,
 * compatível com o tipo `Bytes` do Prisma e `uniqueidentifier`/`binary(16)` do SQL Server.
 *
 * @returns {Buffer} Um Buffer de 16 bytes representando o UUID.
 */
export function generateUUIDBuffer(): Buffer {
  // 1. Gera um UUID padrão como uma string (ex: 'f8a4a5b0-3b9c-4e4a-9e1e-2b0a1b9b0a1b')
  const uuidString = uuidv4();

  // 2. Converte a string do UUID para a sua representação em bytes (um array de 16 números)
  const uuidBytes = uuidParse(uuidString);

  // 3. Cria um Buffer Node.js a partir do array de bytes
  const buffer = Buffer.from(uuidBytes);

  return buffer;
}

/**
 * Retorna a data do final do século atual (31 de dezembro do último ano do século).
 *
 * Exemplo: Se o ano atual for 2023, retornará 31 de dezembro de 2099.
 *
 * @returns {Date} A data representando o final do século atual.
 */
export function getGreatestValidDate(): Date {
  const currentYear = new Date().getFullYear();
  const centuryStartYear = Math.floor((currentYear - 1) / 100) * 100 + 1;
  const centuryEndYear = centuryStartYear + 99;

  return new Date(centuryEndYear, 11, 31); // mês 11 = dezembro (0-indexado)
}
