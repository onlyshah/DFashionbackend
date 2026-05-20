// Category Seeder
const Category = require('../../../models/Category');

async function seedCategories() {
  console.log('📦 Seeding categories...');
  
  const deletedCount = await Category.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing categories`);
  
  const categories = [
    {
      name: 'Womens Fashion',
      description: 'Latest trends in womens clothing and accessories',
      image: '/uploads/categories/womens-fashion.jpg',
      isActive: true,
      displayOrder: 1
    },
    {
      name: 'Mens Fashion',
      description: 'Premium mens clothing collection',
      image: '/uploads/categories/mens-fashion.jpg',
      isActive: true,
      displayOrder: 2
    },
    {
      name: 'Accessories',
      description: 'Bags, jewelry, and fashion accessories',
      image: '/uploads/categories/accessories.jpg',
      isActive: true,
      displayOrder: 3
    },
    {
      name: 'Footwear',
      description: 'Shoes and footwear for all occasions',
      image: '/uploads/categories/footwear.jpg',
      isActive: true,
      displayOrder: 4
    },
    {
      name: 'Sports and Activewear',
      description: 'Athletic and sports clothing',
      image: '/uploads/categories/sports.jpg',
      isActive: true,
      displayOrder: 5
    }
  ];
  
  const result = await Category.insertMany(categories);
  console.log(`   ✅ Created ${result.length} categories`);
  
  return result;
}

module.exports = seedCategories;

