require('dotenv').config();
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'dfashion';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;

let sequelize;

// Function to drop and recreate database (for corrupted schema)
async function dropAndRecreateDatabase(adminSequelize) {
  console.log(`⚠️  Dropping corrupted database "${DB_NAME}"...`);
  
  try {
    // Terminate all connections to the target database
    await adminSequelize.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${DB_NAME}';
    `);
    
    // Drop the database
    await adminSequelize.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);
    console.log(`✅ Database "${DB_NAME}" dropped\n`);
    
    // Create fresh database
    console.log(`📝 Creating fresh database "${DB_NAME}"...`);
    await adminSequelize.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`✅ Database "${DB_NAME}" created successfully\n`);
  } catch (error) {
    console.error('❌ Error dropping/recreating database:', error.message);
    throw error;
  }
}

// Function to create database if it doesn't exist
async function ensureDatabaseExists(forceRecreate = false) {
  console.log('\n🔧 Checking PostgreSQL Database...\n');
  
  // Connect to default 'postgres' database to execute CREATE DATABASE
  const adminSequelize = new Sequelize('postgres', DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false
  });

  try {
    await adminSequelize.authenticate();
    console.log('✅ Connected to PostgreSQL server\n');

    // Check if database exists
    const [result] = await adminSequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`
    );

    if (forceRecreate || result.length === 0) {
      if (forceRecreate && result.length > 0) {
        await dropAndRecreateDatabase(adminSequelize);
      } else if (result.length === 0) {
        console.log(`📝 Database "${DB_NAME}" does not exist. Creating...`);
        await adminSequelize.query(`CREATE DATABASE "${DB_NAME}"`);
        console.log(`✅ Database "${DB_NAME}" created successfully\n`);
      }
    } else {
      console.log(`✅ Database "${DB_NAME}" already exists\n`);
    }

    await adminSequelize.close();
  } catch (error) {
    console.error('❌ Error managing database:', error.message);
    try {
      await adminSequelize.close();
    } catch (e) {
      // ignore
    }
    throw error;
  }
}

// Initialize connection to target database
function initializeSequelize() {
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'postgres',
    logging: false
  });
}

// Helper function to extract table name from seeder file
function extractTableFromSeeder(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Common patterns to extract table names
    const patterns = [
      /tableName:\s*['"](\w+)['"]/,
      /table:\s*['"](\w+)['"]/,
      /_table\s*=\s*['"](\w+)['"]/,
      /FROM\s+['"]?(\w+)['"]?/i,
      /INTO\s+['"]?(\w+)['"]?/i,
      /table_name\s*=\s*['"](\w+)['"]/,
      /\.define\(['"](\w+)['"]/,
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function getSeederInfo() {
  const seederDir = path.join(__dirname, 'dbseeder/scripts/postgres');
  const seeders = {};
  
  if (fs.existsSync(seederDir)) {
    const files = fs.readdirSync(seederDir).filter(f => f.endsWith('.seeder.js'));
    
    files.forEach(file => {
      const tableName = extractTableFromSeeder(path.join(seederDir, file));
      if (tableName) {
        seeders[tableName] = file;
      }
    });
  }
  
  return seeders;
}

async function checkSchema() {
  let retryCount = 0;
  const maxRetries = 1;
  let adminSequelize;
  
  while (retryCount <= maxRetries) {
    sequelize = null; // Reset sequelize each iteration
    adminSequelize = null;
    
    try {
      // Step 1: Ensure database exists
      const forceRecreate = retryCount > 0; // Force recreate on retry
      await ensureDatabaseExists(forceRecreate);

      // Step 2: Only sync schema on first run (when tables dont exist)
      console.log('🔧 Checking existing database schema...\n');
      
      // Create connection to target database to check table count
      adminSequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
        host: DB_HOST,
        port: DB_PORT,
        dialect: 'postgres',
        logging: false
      });
      
      const [tableCountResult] = await adminSequelize.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      
      const existingTableCount = parseInt(tableCountResult[0]?.count || 0);
      console.log(`Found ${existingTableCount} existing tables\n`);
      
      await adminSequelize.close();
      adminSequelize = null;
      
      // Only sync/create tables if they don't exist (first run)
      // If we have 40+ tables, assume schema is already built
      if (existingTableCount < 40) {
        console.log('📋 Creating database tables from model definitions...');
        const models = require('../../models_sql');
        const sequelizeInstance = await models.getSequelizeInstance();
        
        if (models.reinitializeModels) {
          await models.reinitializeModels();
        }
        
        // Use force: true only on completely fresh databases (0 tables)
        await sequelizeInstance.sync({ force: existingTableCount === 0, logging: false });
        console.log('✅ Database schema initialized successfully\n');
        
        try {
          await sequelizeInstance.close();
        } catch (e) {
          // ignore
        }
      } else {
        console.log(`✅ Database already populated with ${existingTableCount} tables - skipping sync to preserve data\n`);
      }
      
      // Step 3: Initialize connection and validate schema
      initializeSequelize();

      console.log('🔍 Checking PostgreSQL Database Schema & Seeders...\n');
      
      await sequelize.authenticate();
      console.log('✅ Database connection verified\n');

      // Get accurate row counts for all tables
      const result = await sequelize.query(`
        SELECT 
          schemaname,
          relname as table_name,
          n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY relname;
      `, { type: Sequelize.QueryTypes.SELECT });

      if (result.length === 0) {
        console.log('⚠️  No tables found in public schema.\n');
        return;
      }

      // Get seeder information
      const seeders = await getSeederInfo();

      console.log('📊 TABLE STATISTICS & SEEDER STATUS');
      console.log('═'.repeat(100));
      console.log('Table Name                    | Row Count | Status | Seeder Found');
      console.log('─'.repeat(100));

      let emptyTables = 0;
      let totalTables = 0;
      let totalRows = 0;
      const emptyTablesList = [];
      const populatedTables = [];
      const emptyWithSeeder = [];
      const emptyNoSeeder = [];

      result.forEach(row => {
        totalTables++;
        const rowCount = parseInt(row.row_count) || 0;
        totalRows += rowCount;
        
        const tableName = row.table_name.padEnd(29);
        const rowCountStr = String(rowCount).padStart(9);
        const status = rowCount === 0 ? '❌ EMPTY' : '✅ OK';
        const hasSeeder = seeders[row.table_name] ? '✅ Yes' : '❌ No';
        
        console.log(`${tableName}| ${rowCountStr} | ${status} | ${hasSeeder}`);
        
        if (rowCount === 0) {
          emptyTables++;
          emptyTablesList.push(row.table_name);
          
          if (seeders[row.table_name]) {
            emptyWithSeeder.push({ table: row.table_name, seeder: seeders[row.table_name] });
          } else {
            emptyNoSeeder.push(row.table_name);
          }
        } else {
          populatedTables.push({ name: row.table_name, count: rowCount });
        }
      });

      console.log('═'.repeat(100));
      console.log('');
      console.log('📈 SUMMARY');
      console.log('─'.repeat(100));
      console.log(`Total Tables:              ${totalTables}`);
      console.log(`Tables with Data:          ${totalTables - emptyTables}`);
      console.log(`Empty Tables:              ${emptyTables} (${((emptyTables/totalTables)*100).toFixed(1)}%)`);
      console.log(`Total Rows in DB:          ${totalRows}`);
      console.log('');

      // Show populated tables with most rows
      if (populatedTables.length > 0) {
        console.log('✅ TOP 10 POPULATED TABLES:');
        console.log('─'.repeat(100));
        populatedTables
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .forEach((table, idx) => {
            console.log(`  ${idx + 1}. ${table.name.padEnd(40)} : ${table.count} rows`);
          });
        console.log('');
      }

      // Show empty tables with seeders that haven't run
      if (emptyWithSeeder.length > 0) {
        console.log('⚠️  EMPTY TABLES WITH SEEDERS (NOT EXECUTED):');
        console.log('─'.repeat(100));
        console.log('These tables have seeder files but NO DATA - seeders likely failed or had schema issues:\n');
        emptyWithSeeder.forEach(item => {
          console.log(`  • ${item.table.padEnd(40)} ← Seeder: ${item.seeder}`);
        });
        console.log('');
      }

      // Show empty tables without seeders
      if (emptyNoSeeder.length > 0) {
        console.log('❌ EMPTY TABLES WITHOUT SEEDERS (NO DATA SOURCE):');
        console.log('─'.repeat(100));
        console.log('These tables have no seeder files - need to create seeders:\n');
        emptyNoSeeder.forEach(table => {
          console.log(`  • ${table}`);
        });
        console.log('');
      }

      // Show all seeders and their status
      if (Object.keys(seeders).length > 0) {
        console.log('📋 SEEDER FILES ANALYSIS:');
        console.log('─'.repeat(100));
        const seederArray = Object.entries(seeders);
        seederArray.forEach(([tableName, seederFile]) => {
          const hasData = populatedTables.some(t => t.name === tableName);
          const rowCount = result.find(r => r.table_name === tableName)?.row_count || 0;
          const status = hasData ? `✅ Seeded (${rowCount} rows)` : '⚠️  NOT SEEDED';
          console.log(`  • ${seederFile.padEnd(45)} → ${tableName.padEnd(30)} ${status}`);
        });
        console.log('');
      }

      // Show detailed empty table info
      if (emptyWithSeeder.length > 0) {
        console.log('⚠️  WHY EMPTY TABLES WITH SEEDERS FAILED:');
        console.log('─'.repeat(100));
        console.log(`Common reasons:\n`);
        console.log(`  1. Schema mismatch - Seeder tries to insert non-existent columns`);
        console.log(`  2. Model definition mismatch - Model fields don't match database columns`);
        console.log(`  3. Seeder validation failed - notNull violations or type mismatches`);
        console.log(`  4. Foreign key constraints - Related tables have no data`);
        console.log(`  5. Database transaction rolled back - Error caused rollback\n`);
        console.log(`📝 Check master seeder output for specific error messages.\n`);
      }

      console.log('✅ Schema check completed!\n');
      return; // Success - exit the retry loop

    } catch (error) {
      console.error(`\n❌ Error on attempt ${retryCount + 1}:`, error.message);
      if (error.original) {
        console.error('Database error:', error.original.message);
      }
      
      // If it's a schema-related error and we haven't retried yet, try dropping/recreating
      const isSchemaError = error.message.includes('does not exist') || 
                           error.message.includes('relation') ||
                           (error.original && error.original.message.includes('does not exist'));
      
      if (retryCount < maxRetries && isSchemaError) {
        console.log(`\n🔄 Retrying with fresh database (attempt ${retryCount + 2}/${maxRetries + 1})...\n`);
        retryCount++;
      } else {
        // Max retries exceeded or non-recoverable error
        throw error;
      }
    } finally {
      if (sequelize) {
        try {
          await sequelize.close();
        } catch (e) {
          // ignore close errors
        }
      }
    }
  }
}

// Run the check
if (require.main === module) {
  checkSchema().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = checkSchema;
