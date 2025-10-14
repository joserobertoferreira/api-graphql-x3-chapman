import { PrismaClient } from 'src/generated/prisma';
import { env } from './env';

const buildDatabaseUrl = (): string => {
  const server = env.DB_SERVER;
  const user = env.DB_USERNAME;
  const password = env.DB_PASSWORD;
  const dbName = env.DB_DATABASE;
  const dbSchema = env.DB_SCHEMA;
  const encrypt = false;
  const dbInstance = env.DB_INSTANCE || ''; // Optional instance name
  const trustServerCertificate = true;
  const databaseUrl = env.DATABASE_URL;

  if (!server || !user || !password || !dbName) {
    console.error('FATAL ERROR: Missing database connection details in environment variables.');
    process.exit(1);
  }

  // SQL Server connection string format
  // "sqlserver://USER:PASSWORD@server:PORT;database=DB_DATABASE;encrypt=true;trustServerCertificate=true"
  const encodedPassword = encodeURIComponent(password);

  if (databaseUrl) {
    // If DATABASE_URL is provided, use it directly
    return databaseUrl;
  }
  // Otherwise, construct the URL from individual components
  return `sqlserver://${server};instanceName=${dbInstance};database=${dbName};schema=${dbSchema};user=${user};password=${encodedPassword};encrypt=${encrypt};trustServerCertificate=${trustServerCertificate}`;
};

const DATABASE_URL_RUNTIME = buildDatabaseUrl();

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL_RUNTIME,
    },
  },
  log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
