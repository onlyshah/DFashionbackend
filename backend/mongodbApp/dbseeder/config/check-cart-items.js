const { Sequelize } = require('sequelize');

(async () => {
  const s = new Sequelize({
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'dfashion',
    dialect: 'postgres',
    logging: false
  });
  
  await s.authenticate();
  
  const [cols] = await s.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'cart_items'
    ORDER BY ordinal_position
  `);
  
  console.log('cart_items columns:');
  cols.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'nullable' : 'not null'})`));
  
  process.exit(0);
})();
