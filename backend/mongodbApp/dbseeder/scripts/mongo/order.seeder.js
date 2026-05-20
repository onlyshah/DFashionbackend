// Order Seeder
const User = require('../../../models/User');
const Product = require('../../../models/Product');
const Order = require('../../../models/Order');

async function seedOrders() {
  console.log('📦 Seeding orders...');
  
  const deletedCount = await Order.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing orders`);
  
  const customers = await User.find({ role: 'end_user' }).limit(5);
  const products = await Product.find().limit(20);
  
  if (customers.length === 0 || products.length === 0) {
    throw new Error('Customers or products not found');
  }
  
  const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const orders = [];
  
  customers.forEach((customer, idx) => {
    const orderItems = [];
    const numItems = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numItems; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      orderItems.push({
        product: product._id,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: product.price,
        discount: product.discount
      });
    }
    
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round(subtotal * 0.18);
    const shipping = 150;
    const total = subtotal + tax + shipping;
    const status = statuses[idx % statuses.length];
    
    orders.push({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        firstName: customer.fullName.split(' ')[0],
        lastName: customer.fullName.split(' ')[1] || 'User',
        email: customer.email,
        phoneNumber: '9876543210',
        street: `${100 + idx} Fashion Street`,
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400000',
        country: 'India'
      },
      payment: {
        method: 'credit_card',
        status: status === 'pending' ? 'pending' : 'completed',
        transactionId: `TXN-${Date.now()}-${idx}`,
        paidAt: status === 'pending' ? null : new Date()
      },
      pricing: {
        subtotal,
        tax,
        shipping,
        discount: 0,
        total
      },
      status,
      tracking: {
        trackingNumber: `TRACK-${Date.now()}-${idx}`,
        carrier: 'DHL',
        url: `https://tracking.example.com/${idx}`
      }
    });
  });
  
  const result = await Order.insertMany(orders);
  console.log(`   ✅ Created ${result.length} orders`);
  
  return result;
}

module.exports = seedOrders;

