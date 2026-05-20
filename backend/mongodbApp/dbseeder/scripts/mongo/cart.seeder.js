// Cart Seeder
const User = require('../../../models/User');
const Product = require('../../../models/Product');
const Cart = require('../../../models/Cart');

async function seedCarts() {
  console.log('🛒 Seeding carts...');
  
  const deletedCount = await Cart.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing carts`);
  
  const customers = await User.find({ role: 'end_user' }).limit(5);
  const products = await Product.find().limit(10);
  
  if (customers.length === 0 || products.length === 0) {
    throw new Error('Customers or products not found');
  }
  
  const carts = [];
  customers.forEach(customer => {
    const cartItems = [];
    const selectedProducts = products.slice(0, Math.floor(Math.random() * 3) + 1);
    
    selectedProducts.forEach(product => {
      cartItems.push({
        product: product._id,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: product.price,
        discount: product.discount
      });
    });
    
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.18);
    const shipping = 100;
    const total = subtotal + tax + shipping;
    
    carts.push({
      user: customer._id,
      items: cartItems,
      subtotal,
      tax,
      shipping,
      total
    });
  });
  
  const result = await Cart.insertMany(carts);
  console.log(`   ✅ Created ${result.length} carts`);
  
  return result;
}

module.exports = seedCarts;

