const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const host = process.env.PGHOST || process.env.POSTGRES_HOST || '127.0.0.1';
const port = parseInt(process.env.PGPORT || process.env.POSTGRES_PORT, 10) || 5432;
const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
let password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || '1234';
const database = process.env.PGDATABASE || process.env.POSTGRES_DB || 'dfashion';
const max = parseInt(process.env.PG_MAX_POOL_SIZE || '10', 10);
const envFilePath = path.resolve(__dirname, '../.env');

const placeholderPasswords = new Set(['', 'your_password', 'password', '123', 'postgres']);

// Helper to prompt for a hidden password in interactive TTYs
const promptHidden = (promptText) => new Promise((resolve, reject) => {
  if (!process.stdin.isTTY) return reject(new Error('Non-interactive terminal; cannot prompt for password'));
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  process.stdout.write(promptText);
  let input = '';
  const onData = (char) => {
    char = String(char);
    const code = char.charCodeAt(0);
    if (code === 13 || code === 10) { // Enter
      process.stdout.write('\n');
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      return resolve(input);
    }
    if (code === 3) { // Ctrl+C
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      return reject(new Error('Input cancelled'));
    }
    if (code === 127 || code === 8) { // Backspace
      if (input.length > 0) {
        input = input.slice(0, -1);
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(promptText + '*'.repeat(input.length));
      }
      return;
    }
    input += char;
    process.stdout.write('*');
  };
  stdin.on('data', onData);
});

// Save password to .env file
const savePasswordToEnv = (pwd) => {
  try {
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    if (envContent.includes('PGPASSWORD=')) {
      envContent = envContent.replace(/PGPASSWORD=.*/g, `PGPASSWORD=${pwd}`);
    } else {
      envContent += `\nPGPASSWORD=${pwd}`;
    }
    fs.writeFileSync(envFilePath, envContent, 'utf8');
    console.log('✅ Password saved to .env');
  } catch (err) {
    console.warn('⚠️  Could not save password to .env:', err.message);
  }
};

// Test connection with given password
const testConnection = async (testPassword) => {
  const testPool = new Pool({ host, port, user, password: testPassword, database, max });
  try {
    const client = await testPool.connect();
    try {
      await client.query('SELECT NOW()');
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    return false;
  } finally {
    await testPool.end();
  }
};

const ensurePassword = async () => {
  // Skip prompting in non-interactive environments
  if (!process.stdin.isTTY) {
    console.log('⚠️  Non-interactive mode: using password from environment');
    return password;
  }
  console.log(`🔍 Current password value: "${password}"`);
  console.log(`🔍 Is placeholder? ${placeholderPasswords.has(String(password).trim())}`);
  if (!placeholderPasswords.has(String(password).trim())) {
    console.log('✅ Valid password already set, skipping prompt');
    return password;
  }
  console.warn('⚠️  PostgreSQL password appears to be a placeholder or unset.');
  if (true) {
    console.log('📝 Interactive mode detected, prompting for password...');
    let retries = 3;
    while (retries > 0) {
      try {
        const entered = await promptHidden('Enter Postgres password: ');
        if (!entered) {
          console.warn('❌ Password cannot be empty.');
          retries--;
          if (retries > 0) console.warn(`Retries left: ${retries}`);
          continue;
        }
        // Test the password
        console.log('🔐 Testing password...');
        const isValid = await testConnection(entered);
        if (!isValid) {
          console.warn('❌ Password authentication failed.');
          retries--;
          if (retries > 0) console.warn(`Retries left: ${retries}`);
          continue;
        }
        password = entered;
        savePasswordToEnv(password);
        return password;
      } catch (err) {
        throw new Error('Failed to obtain Postgres password interactively: ' + err.message);
      }
    }
    throw new Error('Failed to authenticate with provided passwords after 3 attempts');
  }
  console.error('❌ Non-interactive mode detected, cannot prompt for password');
  throw new Error('Postgres password unset or placeholder and cannot prompt in non-interactive mode');
};

let pool;
const getPool = async () => {
  if (pool) return pool;
  await ensurePassword();
  pool = new Pool({ host, port, user, password, database, max });
  return pool;
};

const connectPostgres = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    const poolInst = await getPool();
    const client = await poolInst.connect();
    try {
      const res = await client.query('SELECT NOW()');
      console.log('✅ PostgreSQL connected:', res.rows[0]);
    } finally {
      client.release();
    }
    return poolInst;
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err.message || err);
    throw err;
  }
};

module.exports = {
  connectPostgres,
  getPool,
  // `pgPool()` returns current pool instance or undefined if not created yet.
  pgPool: () => pool
};
