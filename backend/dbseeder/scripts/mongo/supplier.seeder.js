/**
 * Supplier Seeder
 * Seeds suppliers and inventory history for the system
 */

const { sequelize, Sequelize } = require('../config/sequelize');

// Define Supplier model directly
const Supplier = sequelize.define('Supplier', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: Sequelize.STRING(200), allowNull: false, unique: true },
  email: { type: Sequelize.STRING(150), allowNull: false, validate: { isEmail: true } },
  phone: { type: Sequelize.STRING(20), allowNull: false },
  address: Sequelize.TEXT,
  city: Sequelize.STRING(100),
  state: Sequelize.STRING(100),
  zipCode: Sequelize.STRING(20),
  country: Sequelize.STRING(100),
  contactPerson: Sequelize.STRING(150),
  website: Sequelize.STRING(255),
  companyRegistration: Sequelize.STRING(100),
  taxId: Sequelize.STRING(50),
  paymentTerms: Sequelize.STRING(255),
  minimumOrderQuantity: { type: Sequelize.INTEGER, defaultValue: 1 },
  leadTime: Sequelize.INTEGER,
  status: { type: Sequelize.ENUM('active', 'inactive', 'pending'), defaultValue: 'active' },
  rating: Sequelize.DECIMAL(3, 2),
  notes: Sequelize.TEXT,
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'suppliers', timestamps: true });

// Define InventoryHistory model directly
const InventoryHistory = sequelize.define('InventoryHistory', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  inventoryId: { type: Sequelize.INTEGER, allowNull: false },
  productId: { type: Sequelize.INTEGER },
  warehouseId: { type: Sequelize.INTEGER },
  transactionType: { type: Sequelize.ENUM('in', 'out', 'adjustment', 'return'), allowNull: false },
  quantity: { type: Sequelize.INTEGER, allowNull: false },
  reason: Sequelize.STRING(255),
  reference: Sequelize.STRING(100),
  notes: Sequelize.TEXT,
  performedBy: Sequelize.STRING(100),
  timestamp: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
}, { tableName: 'inventory_histories', timestamps: true });

const seedSuppliers = async () => {
  try {
    console.log('🌱 Starting supplier and inventory history seeding...');

    // Ensure DB connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync tables
    await Supplier.sync({ alter: true });
    console.log('✅ Supplier table synced');

    await InventoryHistory.sync({ alter: true });
    console.log('✅ InventoryHistory table synced');

    // 1. Seed Suppliers
    console.log('🏢 Seeding suppliers...');
    const supplierCount = await Supplier.count();
    
    if (supplierCount === 0) {
      const suppliers = await Supplier.bulkCreate([
        {
          name: 'Global Textile Exports Ltd',
          email: 'contact@globaltextile.com',
          phone: '+91-9876543210',
          address: '123 Textile Park, Industrial Area',
          city: 'Tiruppur',
          state: 'Tamil Nadu',
          zipCode: '641601',
          country: 'India',
          contactPerson: 'Rajesh Kumar',
          website: 'https://www.globaltextile.com',
          companyRegistration: 'TN-REG-2020-001',
          taxId: 'TN29ABCDE1234F1Z0',
          paymentTerms: 'Net 30',
          minimumOrderQuantity: 100,
          leadTime: 7,
          status: 'active',
          rating: 4.5,
          notes: 'Reliable supplier with good lead times'
        },
        {
          name: 'Fashion Fabrics International',
          email: 'sales@fashionfabrics.com',
          phone: '+91-9765432100',
          address: '456 Fashion Street, Business Park',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001',
          country: 'India',
          contactPerson: 'Priya Singh',
          website: 'https://www.fashionfabrics.com',
          companyRegistration: 'KA-REG-2019-045',
          taxId: 'KA29XYZAB5678P1A1',
          paymentTerms: 'Net 45',
          minimumOrderQuantity: 50,
          leadTime: 5,
          status: 'active',
          rating: 4.7,
          notes: 'Premium quality fabrics, quick turnaround'
        },
        {
          name: 'Delhi Dyeing & Printing Co.',
          email: 'enquiry@delhidyeing.com',
          phone: '+91-9654321000',
          address: '789 Industrial Complex, Sector 5',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001',
          country: 'India',
          contactPerson: 'Amit Sharma',
          website: 'https://www.delhidyeing.com',
          companyRegistration: 'DL-REG-2018-023',
          taxId: 'DL29MNOPQ9012R1M1',
          paymentTerms: 'Net 60',
          minimumOrderQuantity: 200,
          leadTime: 10,
          status: 'active',
          rating: 4.2,
          notes: 'Specialized in printing and dyeing'
        },
        {
          name: 'Mumbai Apparel Traders',
          email: 'info@mumbaiapparel.com',
          phone: '+91-8765432100',
          address: '321 Trade Center, Textile Hub',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001',
          country: 'India',
          contactPerson: 'Vikram Patel',
          website: 'https://www.mumbaiapparel.com',
          companyRegistration: 'MH-REG-2017-089',
          taxId: 'MH29STUV1234W1S1',
          paymentTerms: 'Net 30',
          minimumOrderQuantity: 75,
          leadTime: 8,
          status: 'active',
          rating: 4.4,
          notes: 'Good variety and competitive pricing'
        },
        {
          name: 'Chennai Export House',
          email: 'business@chennaiexport.com',
          phone: '+91-7654321000',
          address: '654 Export Zone, Port Area',
          city: 'Chennai',
          state: 'Tamil Nadu',
          zipCode: '600001',
          country: 'India',
          contactPerson: 'Ravi Krishnan',
          website: 'https://www.chennaiexport.com',
          companyRegistration: 'TN-REG-2016-034',
          taxId: 'TN29XYZA5678B1X1',
          paymentTerms: 'Net 45',
          minimumOrderQuantity: 150,
          leadTime: 12,
          status: 'active',
          rating: 3.9,
          notes: 'Specializes in bulk exports'
        }
      ]);
      console.log(`✅ Created ${suppliers.length} suppliers`);
    } else {
      console.log(`⏭️  Suppliers already exist (${supplierCount}), skipping creation`);
    }

    // 2. Skip Inventory History - requires warehouse IDs that aren't available yet
    console.log('⏭️  Inventory History seeding skipped (use PostgreMaster seeder for complete data)')

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeder if called directly
if (require.main === module) {
  seedSuppliers();
}

module.exports = { seedSuppliers };
