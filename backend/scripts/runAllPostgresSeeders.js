// Run all Postgres-compatible seeders in ./scripts
// It skips files that reference 'mongoose' to avoid Mongo-only seeders.
// Usage: node scripts/runAllPostgresSeeders.js

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SCRIPTS_DIR = __dirname;

const isJsFile = (n) => n.endsWith('.js');

const runFile = (file) => {
  return new Promise((resolve, reject) => {
    console.log(`\n--- Running ${file} ---`);
    const child = spawn(process.execPath, [path.join(SCRIPTS_DIR, file)], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ ${file} finished successfully`);
        resolve();
      } else {
        console.error(`❌ ${file} exited with code ${code}`);
        reject(new Error(`${file} failed with code ${code}`));
      }
    });

    child.on('error', (err) => reject(err));
  });
};

async function main() {
  console.log('🔎 Scanning scripts directory for seeders...');
  const files = fs.readdirSync(SCRIPTS_DIR).filter(isJsFile).sort();

  // Exclude runner and helper scripts
  const exclude = new Set(['runAllPostgresSeeders.js', 'run_seed_postgres.ps1', 'testPostgres.js']);

  const candidates = [];
  for (const f of files) {
    if (exclude.has(f)) continue;
    const full = path.join(SCRIPTS_DIR, f);
    const content = fs.readFileSync(full, 'utf8');
    // Skip obvious Mongo-specific seeders
    if (/\bmongoose\b/.test(content) || /require\(['"]mongoose['"]\)/.test(content)) {
      console.log(`- Skipping ${f} (mongoose detected)`);
      continue;
    }
    // Skip files that are utilities or not seeders
    if (/seedPostgresBootstrap|seedPostgresAll|\.seeder\.js$|seeder\.js$/i.test(f) || /seed/i.test(f)) {
      // include seedPostgres* and other seeders that do not use mongoose
      candidates.push(f);
      continue;
    }
    // As a last resort, include files with 'seed' in the name
    if (/seed/i.test(f)) candidates.push(f);
  }

  if (candidates.length === 0) {
    console.log('No Postgres-compatible seeders found to run.');
    return;
  }

  console.log('Found seeders to run:', candidates.join(', '));

  for (const file of candidates) {
    try {
      await runFile(file);
    } catch (err) {
      console.error(`Error running ${file}:`, err.message || err);
      console.log('Continuing with next seeder...');
    }
  }

  console.log('\n🎉 All runnable Postgres-compatible seeders attempted');
}

main().catch((err) => {
  console.error('Runner failed:', err && err.stack ? err.stack : err);
  process.exit(1);
});
