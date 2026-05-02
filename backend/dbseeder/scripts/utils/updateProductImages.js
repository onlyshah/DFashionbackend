const models = require('../models_sql');

(async () => {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('DB connection failed');
    if (models.reinitializeModels) await models.reinitializeModels();

    const Product = models.Product;

    // Get all products and update with image URL
    const products = await Product.findAll({ limit: 15 });
    
    console.log(`Found ${products.length} products to update`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      product.imageUrl = `https://via.placeholder.com/300x300?text=${encodeURIComponent(product.title || 'Fashion')}`;
      product.ratings = 4.5 + (Math.random() * 0.4);
      product.reviews = 50 + Math.floor(Math.random() * 100);
      await product.save();
    }

    console.log('✅ Updated all products with image URLs and ratings');

    // Get a sample to verify
    const updated = await Product.findAll({ 
      attributes: ['id', 'title', 'imageUrl', 'ratings', 'isActive'],
      limit: 5 
    });

    console.log('\nSample updated products:');
    updated.forEach(p => {
      console.log(`  ${p.title}: image=${p.imageUrl ? '✓' : '✗'}, ratings=${p.ratings}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
