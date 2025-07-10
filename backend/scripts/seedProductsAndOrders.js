const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Wishlist = require('../models/Wishlist');
const Notification = require('../models/Notification');
const Payment = require('../models/Payment');

require('dotenv').config();

async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dfashion';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Fashion product data
const fashionProducts = [
  // Men's Clothing
  {
    name: "Classic Cotton Kurta",
    description: "Traditional cotton kurta perfect for festivals and casual wear",
    category: "Men's Clothing",
    subcategory: "Ethnic Wear",
    price: 1299,
    originalPrice: 1599,
    brand: "Manyavar",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Cream", "Light Blue", "Maroon"],
    tags: ["ethnic", "cotton", "kurta", "traditional", "festival"],
    images: [
      "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=500",
      "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=500&h=600"
    ]
  },
  {
    name: "Slim Fit Denim Jeans",
    description: "Premium quality slim fit jeans with stretch fabric",
    category: "Men's Clothing",
    subcategory: "Jeans",
    price: 2499,
    originalPrice: 3499,
    brand: "Levi's",
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["Dark Blue", "Light Blue", "Black"],
    tags: ["jeans", "denim", "slim fit", "casual", "premium"],
    images: [
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=600"
    ]
  },
  {
    name: "Formal Cotton Shirt",
    description: "Professional cotton shirt for office and formal occasions",
    category: "Men's Clothing",
    subcategory: "Shirts",
    price: 1799,
    originalPrice: 2299,
    brand: "Van Heusen",
    sizes: ["S", "M", "L", "XL"],
    colors: ["White", "Light Blue", "Pink", "Grey"],
    tags: ["formal", "cotton", "shirt", "office", "professional"],
    images: [
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500",
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&h=600"
    ]
  },
  // Women's Clothing
  {
    name: "Elegant Silk Saree",
    description: "Beautiful silk saree with intricate embroidery work",
    category: "Women's Clothing",
    subcategory: "Sarees",
    price: 4999,
    originalPrice: 6999,
    brand: "Fabindia",
    sizes: ["Free Size"],
    colors: ["Red", "Blue", "Green", "Purple", "Gold"],
    tags: ["saree", "silk", "traditional", "wedding", "elegant"],
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500",
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500&h=600"
    ]
  },
  {
    name: "Designer Anarkali Suit",
    description: "Stunning anarkali suit with mirror work and embroidery",
    category: "Women's Clothing",
    subcategory: "Suits",
    price: 3499,
    originalPrice: 4999,
    brand: "Biba",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Pink", "Blue", "Yellow", "Green"],
    tags: ["anarkali", "suit", "designer", "party", "ethnic"],
    images: [
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500",
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&h=600"
    ]
  },
  {
    name: "Casual Summer Dress",
    description: "Light and comfortable summer dress for casual outings",
    category: "Women's Clothing",
    subcategory: "Dresses",
    price: 1999,
    originalPrice: 2799,
    brand: "Zara",
    sizes: ["XS", "S", "M", "L"],
    colors: ["Floral Print", "Solid Blue", "White", "Yellow"],
    tags: ["dress", "summer", "casual", "comfortable", "trendy"],
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500",
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600"
    ]
  },
  // Footwear
  {
    name: "Leather Formal Shoes",
    description: "Premium leather formal shoes for office and events",
    category: "Footwear",
    subcategory: "Formal Shoes",
    price: 3999,
    originalPrice: 5499,
    brand: "Clarks",
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Black", "Brown", "Tan"],
    tags: ["shoes", "leather", "formal", "office", "premium"],
    images: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500",
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600"
    ]
  },
  {
    name: "Sports Running Shoes",
    description: "Comfortable running shoes with advanced cushioning",
    category: "Footwear",
    subcategory: "Sports Shoes",
    price: 4999,
    originalPrice: 6999,
    brand: "Nike",
    sizes: ["6", "7", "8", "9", "10", "11"],
    colors: ["Black", "White", "Blue", "Red"],
    tags: ["shoes", "sports", "running", "comfortable", "nike"],
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=600"
    ]
  },
  // Accessories
  {
    name: "Designer Handbag",
    description: "Stylish designer handbag for everyday use",
    category: "Accessories",
    subcategory: "Bags",
    price: 2999,
    originalPrice: 4299,
    brand: "Coach",
    sizes: ["Medium"],
    colors: ["Black", "Brown", "Red", "Blue"],
    tags: ["handbag", "designer", "accessories", "stylish", "everyday"],
    images: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500",
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=600"
    ]
  },
  {
    name: "Gold Plated Jewelry Set",
    description: "Elegant gold plated necklace and earrings set",
    category: "Accessories",
    subcategory: "Jewelry",
    price: 1999,
    originalPrice: 2999,
    brand: "Tanishq",
    sizes: ["Free Size"],
    colors: ["Gold", "Rose Gold"],
    tags: ["jewelry", "gold plated", "necklace", "earrings", "elegant"],
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=600"
    ]
  }
];

async function seedProductsAndOrders() {
  try {
    console.log('🛍️ Starting Products and Orders Seeding...\n');

    // Get all users
    const users = await User.find({});
    const customers = users.filter(user => user.role === 'customer');
    
    if (customers.length === 0) {
      console.log('⚠️ No customers found. Please run seedComprehensiveData.js first.');
      return;
    }

    // 1. Create Categories
    console.log('📂 Creating product categories...');
    await Category.deleteMany({});
    
    const categories = await Category.create([
      {
        name: "Men's Clothing",
        description: "Fashion clothing for men",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300",
        isActive: true,
        subcategories: ["Shirts", "T-Shirts", "Jeans", "Trousers", "Ethnic Wear", "Jackets"]
      },
      {
        name: "Women's Clothing",
        description: "Fashion clothing for women",
        image: "https://images.unsplash.com/photo-1494790108755-2616c9c0e6e0?w=300",
        isActive: true,
        subcategories: ["Dresses", "Tops", "Sarees", "Suits", "Jeans", "Skirts"]
      },
      {
        name: "Footwear",
        description: "Shoes and footwear for all",
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300",
        isActive: true,
        subcategories: ["Formal Shoes", "Casual Shoes", "Sports Shoes", "Sandals", "Boots"]
      },
      {
        name: "Accessories",
        description: "Fashion accessories and jewelry",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300",
        isActive: true,
        subcategories: ["Bags", "Jewelry", "Watches", "Belts", "Sunglasses"]
      }
    ]);

    console.log(`✅ Created ${categories.length} categories\n`);

    // 2. Create Products
    console.log('🛍️ Creating fashion products...');
    await Product.deleteMany({});

    // Get category IDs
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // Prepare products with category IDs
    const productsToCreate = fashionProducts.map(product => ({
      ...product,
      category: categoryMap[product.category],
      stock: Math.floor(Math.random() * 100) + 10,
      rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
      reviewCount: Math.floor(Math.random() * 500) + 10,
      isActive: true,
      isFeatured: Math.random() > 0.7,
      createdBy: users.find(u => u.role === 'admin')?._id || users[0]._id,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      updatedAt: new Date()
    }));

    const products = await Product.create(productsToCreate);
    console.log(`✅ Created ${products.length} products\n`);

    // 3. Create Orders
    console.log('📦 Creating customer orders...');
    await Order.deleteMany({});

    const orders = [];
    const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    // Create 2-5 orders per customer
    for (const customer of customers) {
      const orderCount = Math.floor(Math.random() * 4) + 2; // 2-5 orders
      
      for (let i = 0; i < orderCount; i++) {
        const orderProducts = [];
        const productCount = Math.floor(Math.random() * 3) + 1; // 1-3 products per order
        
        // Select random products for this order
        const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, productCount);
        
        let totalAmount = 0;
        selectedProducts.forEach(product => {
          const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
          const price = product.price;
          const itemTotal = price * quantity;
          totalAmount += itemTotal;
          
          orderProducts.push({
            product: product._id,
            quantity: quantity,
            price: price,
            total: itemTotal
          });
        });

        const shippingCost = totalAmount > 1000 ? 0 : 99;
        const tax = Math.round(totalAmount * 0.18); // 18% GST
        const finalAmount = totalAmount + shippingCost + tax;

        orders.push({
          user: customer._id,
          products: orderProducts,
          totalAmount: finalAmount,
          shippingAddress: customer.address,
          billingAddress: customer.address,
          paymentMethod: ['card', 'upi', 'cod', 'wallet'][Math.floor(Math.random() * 4)],
          status: orderStatuses[Math.floor(Math.random() * orderStatuses.length)],
          orderDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Random date within last 60 days
          estimatedDelivery: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within next 7 days
          trackingNumber: `DF${Date.now()}${Math.floor(Math.random() * 1000)}`,
          notes: i === 0 ? 'First order - Welcome discount applied' : ''
        });
      }
    }

    const createdOrders = await Order.create(orders);
    console.log(`✅ Created ${createdOrders.length} orders\n`);

    // 4. Create Shopping Carts
    console.log('🛒 Creating shopping carts...');
    await Cart.deleteMany({});

    const carts = [];
    // Create carts for 70% of customers
    const customersWithCarts = customers.slice(0, Math.floor(customers.length * 0.7));
    
    for (const customer of customersWithCarts) {
      const cartProducts = [];
      const productCount = Math.floor(Math.random() * 5) + 1; // 1-5 products in cart
      
      const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, productCount);
      
      selectedProducts.forEach(product => {
        const quantity = Math.floor(Math.random() * 3) + 1;
        cartProducts.push({
          product: product._id,
          quantity: quantity,
          addedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Added within last 7 days
        });
      });

      carts.push({
        user: customer._id,
        products: cartProducts,
        updatedAt: new Date()
      });
    }

    const createdCarts = await Cart.create(carts);
    console.log(`✅ Created ${createdCarts.length} shopping carts\n`);

    // 5. Create Wishlists
    console.log('❤️ Creating wishlists...');
    await Wishlist.deleteMany({});

    const wishlists = [];
    // Create wishlists for 60% of customers
    const customersWithWishlists = customers.slice(0, Math.floor(customers.length * 0.6));
    
    for (const customer of customersWithWishlists) {
      const wishlistProducts = [];
      const productCount = Math.floor(Math.random() * 8) + 2; // 2-9 products in wishlist
      
      const selectedProducts = products.sort(() => 0.5 - Math.random()).slice(0, productCount);
      
      selectedProducts.forEach(product => {
        wishlistProducts.push({
          product: product._id,
          addedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Added within last 30 days
        });
      });

      wishlists.push({
        user: customer._id,
        products: wishlistProducts,
        updatedAt: new Date()
      });
    }

    const createdWishlists = await Wishlist.create(wishlists);
    console.log(`✅ Created ${createdWishlists.length} wishlists\n`);

    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Orders: ${createdOrders.length}`);
    console.log(`   Shopping Carts: ${createdCarts.length}`);
    console.log(`   Wishlists: ${createdWishlists.length}`);
    console.log('\n🎉 Products and Orders seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during products and orders seeding:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await seedProductsAndOrders();
    console.log('\n✅ Products and Orders seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedProductsAndOrders, connectDatabase };
