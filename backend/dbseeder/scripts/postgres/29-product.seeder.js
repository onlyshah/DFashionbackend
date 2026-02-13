/**
 * 📦 Product Seeder (Phase 3 - Tier 2)
 * Depends on: Brand, Category, User (seller)
 * Creates sample fashion products
 */

const models = require('../../../models_sql');

const productDataTemplates = [
  // Men's T-Shirts
  { title: 'Premium Cotton T-Shirt', category: 'Men', brand: 'Nike', price: 499, discountPrice: 399, stock: 100 },
  { title: 'Graphic Print T-Shirt', category: 'Men', brand: 'Adidas', price: 599, discountPrice: 449, stock: 80 },
  { title: 'V-Neck T-Shirt', category: 'Men', brand: 'Puma', price: 549, discountPrice: 399, stock: 120 },
  
  // Women's Dresses
  { title: 'Summer Casual Dress', category: 'Women', brand: 'H&M', price: 1299, discountPrice: 899, stock: 50 },
  { title: 'Formal Evening Dress', category: 'Women', brand: 'Zara', price: 2499, discountPrice: 1799, stock: 30 },
  { title: 'Maxi Dress', category: 'Women', brand: 'Forever 21', price: 799, discountPrice: 599, stock: 60 },
  
  // Footwear
  { title: 'Sports Running Shoes', category: 'Footwear', brand: 'Nike', price: 3999, discountPrice: 2999, stock: 40 },
  { title: 'Casual Sneakers', category: 'Footwear', brand: 'Adidas', price: 2499, discountPrice: 1899, stock: 55 },
  { title: 'Formal Leather Shoes', category: 'Footwear', brand: 'Tommy Hilfiger', price: 4499, discountPrice: 3599, stock: 25 },
  
  // Accessories
  { title: 'Leather Belt', category: 'Accessories', brand: 'Calvin Klein', price: 899, discountPrice: 649, stock: 100 },
  { title: 'Fashion Handbag', category: 'Accessories', brand: 'Gucci', price: 5999, discountPrice: 4499, stock: 20 },
  { title: 'Wrist Watch', category: 'Accessories', brand: 'Ralph Lauren', price: 8999, discountPrice: 6999, stock: 15 }
];

async function seedProducts() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Product seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Product = models._raw?.Product || models.Product;
    const Brand = models._raw?.Brand || models.Brand;
    const Category = models._raw?.Category || models.Category;
    const User = models._raw?.User || models.User;

    if (!Product || !Product.create) throw new Error('Product model not available');
    if (!Brand || !Brand.findOne) throw new Error('Brand model not available');
    if (!Category || !Category.findOne) throw new Error('Category model not available');
    if (!User || !User.findOne) throw new Error('User model not available');

    // Get a seller user
    const seller = await User.findOne({ where: { username: 'seller1' } });
    if (!seller) throw new Error('Seller user not found. Ensure User seeder ran first.');

    let createdCount = 0;
    let productIndex = 1;

    for (const template of productDataTemplates) {
      const brand = await Brand.findOne({ where: { name: template.brand } });
      const category = await Category.findOne({ where: { name: template.category } });

      if (!brand || !category) {
        console.warn(`⚠️ Brand or Category not found for ${template.title}`);
        continue;
      }

      const productTitle = `${template.title} #${productIndex}`;
      const existing = await Product.findOne({
        where: { title: productTitle }
      });

      if (existing) {
        console.log(`✅ Product '${productTitle}' already exists (skipping)`);
        productIndex++;
        continue;
      }

      await Product.create({
        title: productTitle,
        name: productTitle,
        description: `High-quality ${template.category} product - ${template.title}. Premium materials and excellent craftsmanship.`,
        price: template.price,
        discountPrice: template.discountPrice,
        brandId: brand.id,
        categoryId: category.id,
        sellerId: seller.id,
        sku: `SKU-${Date.now()}-${productIndex}`,
        stock: template.stock,
        isActive: true,
        ratings: Math.floor(Math.random() * 3) + 3,
        reviews: Math.floor(Math.random() * 50) + 10
      });

      console.log(`✅ Created product: ${productTitle}`);
      createdCount++;
      productIndex++;
    }

    console.log(`✨ Product seeding completed (${createdCount} new products)\n`);
    return true;
  } catch (error) {
    console.error('❌ Product seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedProducts };
