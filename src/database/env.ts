import dotenv from 'dotenv';
dotenv.config();

function parseTimeStringToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhdwy])$/); // s, m, h, d, w, y
  if (!match) {
    throw new Error(`Invalid time string format: ${timeString}. Expected format like "15m", "7d", "3600s".`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    case 'w':
      return value * 60 * 60 * 24 * 7;
    case 'y':
      return value * 60 * 60 * 24 * 365; // Aproximação para ano
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

function getEnvVarTimeAsSeconds(key: string, defaultValueAsString?: string): number {
  const valueStr = process.env[key];

  if (valueStr !== undefined) {
    try {
      return parseTimeStringToSeconds(valueStr);
    } catch (error: any) {
      console.error(
        `FATAL ERROR: Environment variable ${key} ("${valueStr}") is not a valid time string: ${error.message}`,
      );
      process.exit(1);
    }
  }

  if (defaultValueAsString !== undefined) {
    try {
      return parseTimeStringToSeconds(defaultValueAsString);
    } catch (error: any) {
      // Se o default for inválido, isso é um erro de programação
      console.error(
        `FATAL ERROR: Default time string for ${key} ("${defaultValueAsString}") is invalid: ${error.message}`,
      );
      process.exit(1);
    }
  }
  // Se não houver valor nem default, e a variável for obrigatória,
  // a validação posterior pegará.
  return undefined as any; // Temporariamente
}

export const env = {
  ACCESS_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION!,
  REFRESH_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION!,
  RESET_EXPIRATION: process.env.PASSWORD_RESET_TOKEN_EXPIRATION!,
  DATABASE_URL: process.env.DATABASE_URL || '', // Usar DATABASE_URL se estiver definido
  DB_SERVER: process.env.DB_SERVER,
  DB_DATABASE: process.env.DB_DATABASE,
  DB_USERNAME: process.env.DB_USERNAME,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_SCHEMA: process.env.DB_SCHEMA,
  DB_AUTH_SCHEMA: process.env.DB_AUTH_SCHEMA,
  DB_INSTANCE: process.env.DB_INSTANCENAME || '', // Optional instance name
  PORT: process.env.PORT || 4000,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET!,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
  PASSWORD_RESET_TOKEN_SECRET: process.env.PASSWORD_RESET_TOKEN_SECRET!,
  ACCESS_TOKEN_EXPIRATION: getEnvVarTimeAsSeconds('ACCESS_EXPIRATION', '15m'), // Default "15m"
  REFRESH_TOKEN_EXPIRATION: getEnvVarTimeAsSeconds('REFRESH_EXPIRATION', '7d'), // Default "7d"
  PASSWORD_RESET_TOKEN_EXPIRATION: getEnvVarTimeAsSeconds('RESET_EXPIRATION', '1h'), // Default "1h"
  NODE_ENV: process.env.NODE_ENV || 'development',
};

const requiredEnvs: (keyof typeof env)[] = [
  'DATABASE_URL',
  'DB_SERVER',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_SCHEMA',
  'DB_AUTH_SCHEMA',
  'DB_INSTANCE',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'PASSWORD_RESET_TOKEN_SECRET',
];

for (const key of requiredEnvs) {
  if (!env[key]) {
    console.error(`FATAL ERROR: Environment variable ${key} is not defined.`);
    process.exit(1);
  }
}
