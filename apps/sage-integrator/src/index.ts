import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('CLI iniciado! App Key:', process.env.CHAPMAN_APP_KEY);
