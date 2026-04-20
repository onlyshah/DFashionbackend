const { Sequelize } = require('sequelize');

async function debug() {
  const sequelize = new Sequelize({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'dfashion',
    dialect: 'postgres',
    logging: false
  });

  await sequelize.authenticate();

  // Try different query methods
  console.log('Method 1: with raw and type');
  const result1 = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 3;",
    { raw: true, type: sequelize.QueryTypes.SELECT }
  );
  console.log('Result 1:', JSON.stringify(result1, null, 2));

  console.log('\n\nMethod 2: plain query');
  const result2 = await sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 3;"
  );
  console.log('Result 2:', JSON.stringify(result2, null, 2));
  console.log('result2[0]:', result2[0]);
  console.log('result2[0][0]:', result2[0][0]);
  console.log('typeof result2[0][0]:', typeof result2[0][0]);

  await sequelize.close();
  process.exit(0);
}

debug();
