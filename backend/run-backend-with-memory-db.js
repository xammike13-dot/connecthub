import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function start() {
  console.log('Starting MongoMemoryServer...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017, // Keep port standard if possible, or random
    }
  });
  const uri = mongod.getUri();
  console.log('MongoMemoryServer started at:', uri);

  process.env.MONGODB_URI = uri;

  const child = spawn('node', [path.join(__dirname, 'server.js')], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('close', (code) => {
    console.log(`Backend process exited with code ${code}`);
    mongod.stop();
    process.exit(code);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    mongod.stop();
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
    mongod.stop();
  });
}

start().catch(err => {
  console.error('Error starting memory server:', err);
});
