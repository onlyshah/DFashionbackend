// Real-world data generators for production-like seeding
const bcrypt = require('bcrypt');

const firstNames = ['Anil', 'Priya', 'Rajesh', 'Neha', 'Vikram', 'Ananya', 'Amit', 'Divya', 'Arjun', 'Pooja',
  'Sameer', 'Isha', 'Kunal', 'Shreya', 'Nikhil', 'Anjali', 'Rohan', 'Meera', 'Sanjay', 'Riya',
  'Akshay', 'Preeti', 'Varun', 'Deepti', 'Harsh', 'Swati', 'Abhishek', 'Gauri', 'Siddharth', 'Tanvi'];

const lastNames = ['Sharma', 'Patel', 'Singh', 'Reddy', 'Kapoor', 'Gupta', 'Verma', 'Joshi', 'Kumar', 'Desai',
  'Nair', 'Pillai', 'Bhat', 'Rao', 'Sinha', 'Dutta', 'Mukherjee', 'Banerjee', 'Bhattacharya', 'Iyer'];

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Surat', 'Indore', 'Nashik', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Nagpur', 'Bhopal', 'Visakhapatnam'];

const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Punjab'];

const productAdjectives = ['Premium', 'Elegant', 'Classic', 'Modern', 'Stylish', 'Trendy', 'Casual', 'Formal', 'Athletic', 'Designer'];
const productNouns = ['Shirt', 'Dress', 'Jacket', 'Jeans', 'Saree', 'Kurti', 'Blazer', 'Cardigan', 'Sweater', 'Lehenga',
  'Salwar', 'T-Shirt', 'Polo', 'Coat', 'Shawl', 'Scarf', 'Belt', 'Shoes', 'Sneakers', 'Heels'];

const productBrands = [
  { name: 'Nike', category: 'Athletic' },
  { name: 'Adidas', category: 'Athletic' },
  { name: 'Puma', category: 'Athletic' },
  { name: 'Gucci', category: 'Luxury' },
  { name: 'Louis Vuitton', category: 'Luxury' },
  { name: 'Burberry', category: 'Luxury' },
  { name: 'H&M', category: 'Fast Fashion' },
  { name: 'Zara', category: 'Fast Fashion' },
  { name: 'Forever 21', category: 'Fast Fashion' },
  { name: 'Uniqlo', category: 'Casual' }
];

const categories = [
  'Men\'s Clothing',
  'Women\'s Clothing',
  'Kids Clothing',
  'Footwear',
  'Accessories',
  'Ethnic Wear',
  'Sportswear',
  'Formal Wear',
  'Casual Wear',
  'Activewear'
];

const paymentMethods = ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'cod'];
const paymentStatuses = ['pending', 'completed', 'failed', 'refunded']; // For Payment model
const orderPaymentStatuses = ['pending', 'paid', 'failed', 'refunded']; // For Order model
const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const returnStatuses = ['pending', 'approved', 'rejected', 'completed']; // For Return model

const couriers = [
  { name: 'FedEx', code: 'FEDEX' },
  { name: 'DHL', code: 'DHL' },
  { name: 'UPS', code: 'UPS' },
  { name: 'Flipkart Logistics', code: 'FLIPKART' },
  { name: 'Amazon Shipping', code: 'AMAZON' }
];

const searchQueries = [
  'men shirt', 'women dress', 'designer saree', 'casual jeans', 'formal blazer',
  'sports shoes', 'ethnic wear', 'summer collection', 'winter jackets', 'trendy accessories',
  'traditional kurti', 'cotton shirts', 'silk sarees', 'leather jackets', 'party dresses'
];

const postTitles = [
  'New Summer Collection Launch', 'Fashion Tips for Spring', 'How to Style Your Saree',
  'Trending Colors This Season', 'Sustainable Fashion Choices', 'Men\'s Fashion Guide',
  'Festival Fashion Ideas', 'Casual to Formal Transition', 'Accessory Shopping Guide', 'Footwear Trends'
];

const locations = [
  { city: 'Mumbai', state: 'Maharashtra', zip: '400001' },
  { city: 'Bangalore', state: 'Karnataka', zip: '560001' },
  { city: 'Delhi', state: 'Delhi', zip: '110001' },
  { city: 'Pune', state: 'Maharashtra', zip: '411001' },
  { city: 'Hyderabad', state: 'Telangana', zip: '500001' },
  { city: 'Chennai', state: 'Tamil Nadu', zip: '600001' },
  { city: 'Kolkata', state: 'West Bengal', zip: '700001' },
  { city: 'Ahmedabad', state: 'Gujarat', zip: '380001' }
];

// Utility functions
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, count) {
  const result = [];
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, arr.length));
}

function generateEmail(firstName, lastName, index) {
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'dfashion.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${getRandomElement(domains)}`;
}

function generatePhone() {
  return '+91' + Math.floor(6000000000 + Math.random() * 9000000000);
}

function generateAddress() {
  const location = getRandomElement(locations);
  const streetNum = Math.floor(Math.random() * 999) + 1;
  return `${streetNum} ${location.city} Street`;
}

function generateProductTitle() {
  return `${getRandomElement(productAdjectives)} ${getRandomElement(productNouns)}`;
}

function generatePrice(min = 299, max = 4999) {
  return Math.floor(min + Math.random() * (max - min));
}

function generateRealisticDate(daysBack = 90) {
  const now = new Date();
  const pastDate = new Date(now - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return pastDate;
}

function generateOrderNumber() {
  const chars = 'DFASHION';
  const prefix = chars + new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `${prefix}${randomNum}`;
}

function generateTicketNumber() {
  return 'TKT' + Date.now() + Math.floor(Math.random() * 1000);
}

function generateUsername(firstName, lastName, index) {
  return `${firstName.toLowerCase()}${lastName.toLowerCase()}${index}`;
}

module.exports = {
  // Data arrays
  firstNames,
  lastNames,
  cities,
  states,
  productAdjectives,
  productNouns,
  productBrands,
  categories,
  paymentMethods,
  paymentStatuses,
  orderPaymentStatuses,
  orderStatuses,
  returnStatuses,
  couriers,
  searchQueries,
  postTitles,
  locations,
  
  // Utility functions
  getRandomElement,
  getRandomElements,
  generateEmail,
  generatePhone,
  generateAddress,
  generateProductTitle,
  generatePrice,
  generateRealisticDate,
  generateOrderNumber,
  generateTicketNumber,
  generateUsername,
  
  // Helper to generate user object
  async generateUser(index, role = 'customer') {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    return {
      username: generateUsername(firstName, lastName, index),
      email: generateEmail(firstName, lastName, index),
      password: await bcrypt.hash(`Password${index}@123`, 12),
      fullName: `${firstName} ${lastName}`,
      role,
      phone: generatePhone(),
      address: generateAddress(),
      city: getRandomElement(cities),
      state: getRandomElement(states),
      isActive: Math.random() > 0.1, // 90% active
      avatar: `/uploads/avatars/avatar${index % 10}.jpg`
    };
  },
  
  // Helper to generate product object
  generateProduct(index, brandId, categoryId) {
    const brand = productBrands[Math.floor(Math.random() * productBrands.length)];
    return {
      title: generateProductTitle(),
      description: `High-quality ${getRandomElement(categories)} from ${brand.name}. Available in multiple colors and sizes.`,
      price: generatePrice(),
      stock: Math.floor(Math.random() * 500) + 10,
      sku: `SKU${Date.now()}${index}`,
      brandId,
      categoryId,
      images: [`/uploads/products/product${index}_1.jpg`, `/uploads/products/product${index}_2.jpg`],
      rating: Math.random() * 2 + 3.5, // 3.5-5.5
      reviewCount: Math.floor(Math.random() * 500)
    };
  },
  
  // Helper to generate order object
  generateOrder(customerId, orderNumber) {
    const status = getRandomElement(orderStatuses);
    const createdAt = generateRealisticDate();
    return {
      orderNumber: orderNumber || generateOrderNumber(),
      customerId,
      items: Array(Math.floor(Math.random() * 3) + 1).fill(null).map(() => ({
        productId: Math.floor(Math.random() * 40) + 1,
        quantity: Math.floor(Math.random() * 3) + 1,
        price: generatePrice()
      })),
      totalAmount: generatePrice(999, 29999),
      status,
      paymentStatus: status === 'pending' ? 'pending' : getRandomElement(paymentStatuses),
      paymentMethod: getRandomElement(paymentMethods),
      shippingAddress: generateAddress(),
      shippingCity: getRandomElement(cities),
      shippingState: getRandomElement(states),
      notes: ['Rush delivery requested', 'Gift wrapping needed', 'Leave with security', 'Call before delivery', ''][Math.floor(Math.random() * 5)],
      createdAt,
      updatedAt: new Date(createdAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
  },

  generateRealisticDate
};
