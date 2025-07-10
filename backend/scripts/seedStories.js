const mongoose = require('mongoose');
const User = require('../models/User');
const Story = require('../models/Story');
const Product = require('../models/Product');

// Load environment variables
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

// Fashion-themed story content
const storyContent = [
  {
    title: "Summer Collection Launch",
    caption: "Check out our latest summer collection! 🌞 #SummerFashion #NewCollection",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#SummerFashion", "#NewCollection", "#OOTD"],
    location: "Mumbai, India"
  },
  {
    title: "Behind the Scenes",
    caption: "Behind the scenes of our latest photoshoot! ✨ #BTS #Fashion",
    media: {
      type: "image", 
      url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#BTS", "#Fashion", "#Photoshoot"],
    location: "Delhi, India"
  },
  {
    title: "Ethnic Wear Special",
    caption: "Traditional meets modern! Our ethnic collection is here 🎉 #EthnicWear #Traditional",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#EthnicWear", "#Traditional", "#IndianFashion"],
    location: "Jaipur, India"
  },
  {
    title: "Men's Fashion Week",
    caption: "Dapper looks for the modern gentleman 👔 #MensFashion #Formal",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#MensFashion", "#Formal", "#Gentleman"],
    location: "Bangalore, India"
  },
  {
    title: "Accessories Collection",
    caption: "Complete your look with our stunning accessories! 💎 #Accessories #Jewelry",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#Accessories", "#Jewelry", "#Fashion"],
    location: "Chennai, India"
  },
  {
    title: "Casual Friday Vibes",
    caption: "Comfort meets style! Perfect for casual Fridays 😎 #CasualWear #Comfort",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#CasualWear", "#Comfort", "#OOTD"],
    location: "Pune, India"
  },
  {
    title: "Wedding Season Special",
    caption: "Make your special day even more special! 💒 #WeddingWear #Special",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#WeddingWear", "#Special", "#Celebration"],
    location: "Udaipur, India"
  },
  {
    title: "Footwear Collection",
    caption: "Step up your style game! 👠👞 #Footwear #Shoes #Style",
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=600&fit=crop",
      resolution: { width: 400, height: 600 }
    },
    hashtags: ["#Footwear", "#Shoes", "#Style"],
    location: "Kolkata, India"
  }
];

async function seedStories() {
  try {
    console.log('📚 Starting Stories Database Seeding...\n');

    // Get all users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('⚠️ No users found. Please run user seeding first.');
      return;
    }

    // Get some products for product tagging
    const products = await Product.find({}).limit(10);

    // Clear existing stories
    console.log('🗑️ Clearing existing stories...');
    await Story.deleteMany({});
    console.log('✅ Existing stories cleared\n');

    // Create stories for different users
    const stories = [];
    const customerUsers = users.filter(user => user.role === 'customer');
    const adminUsers = users.filter(user => ['admin', 'super_admin'].includes(user.role));
    
    // Use customer users primarily, fall back to admin users if needed
    const storyUsers = customerUsers.length >= 5 ? customerUsers.slice(0, 8) : [...customerUsers, ...adminUsers].slice(0, 8);

    console.log(`👥 Creating stories for ${storyUsers.length} users...`);

    for (let i = 0; i < storyContent.length && i < storyUsers.length; i++) {
      const user = storyUsers[i];
      const content = storyContent[i];
      
      // Create story with random timing (last 24 hours)
      const createdAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from creation

      // Randomly select products to tag (0-2 products per story)
      const taggedProducts = products.length > 0 ? 
        products.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3)) : [];

      const story = {
        title: content.title,
        user: user._id,
        media: content.media,
        caption: content.caption,
        hashtags: content.hashtags,
        location: content.location,
        products: taggedProducts.map(product => ({
          product: product._id,
          position: {
            x: Math.random() * 80 + 10, // 10-90% from left
            y: Math.random() * 80 + 10  // 10-90% from top
          }
        })),
        views: Math.floor(Math.random() * 500) + 50, // 50-550 views
        likes: Math.floor(Math.random() * 100) + 10, // 10-110 likes
        isActive: true,
        createdAt: createdAt,
        expiresAt: expiresAt,
        updatedAt: createdAt
      };

      stories.push(story);
    }

    // Create additional stories for some users (multiple stories per user)
    if (storyUsers.length >= 3) {
      const additionalStories = [
        {
          title: "Quick Style Tip",
          caption: "Pro tip: Layer your accessories for a chic look! ✨",
          media: {
            type: "image",
            url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=600&fit=crop",
            resolution: { width: 400, height: 600 }
          },
          hashtags: ["#StyleTip", "#Fashion", "#Accessories"],
          location: "Mumbai, India"
        },
        {
          title: "Color Coordination",
          caption: "Master the art of color coordination! 🎨 #ColorTheory",
          media: {
            type: "image",
            url: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=600&fit=crop&sat=-20",
            resolution: { width: 400, height: 600 }
          },
          hashtags: ["#ColorTheory", "#Fashion", "#Style"],
          location: "Delhi, India"
        }
      ];

      // Add additional stories for first 2 users
      for (let i = 0; i < Math.min(2, additionalStories.length); i++) {
        const user = storyUsers[i];
        const content = additionalStories[i];
        const createdAt = new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000); // Last 12 hours
        
        stories.push({
          title: content.title,
          user: user._id,
          media: content.media,
          caption: content.caption,
          hashtags: content.hashtags,
          location: content.location,
          products: [],
          views: Math.floor(Math.random() * 200) + 20,
          likes: Math.floor(Math.random() * 50) + 5,
          isActive: true,
          createdAt: createdAt,
          expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000),
          updatedAt: createdAt
        });
      }
    }

    // Insert all stories
    const createdStories = await Story.create(stories);
    console.log(`✅ Created ${createdStories.length} stories\n`);

    // Display summary
    console.log('📊 Stories Creation Summary:');
    console.log(`   Total Stories: ${createdStories.length}`);
    console.log(`   Users with Stories: ${storyUsers.length}`);
    console.log(`   Stories with Products: ${createdStories.filter(s => s.products.length > 0).length}`);
    
    // Group stories by user
    const storiesByUser = {};
    for (const story of createdStories) {
      const user = storyUsers.find(u => u._id.toString() === story.user.toString());
      if (user) {
        if (!storiesByUser[user.username]) {
          storiesByUser[user.username] = 0;
        }
        storiesByUser[user.username]++;
      }
    }

    console.log('\n👥 Stories per User:');
    Object.entries(storiesByUser).forEach(([username, count]) => {
      console.log(`   ${username}: ${count} stories`);
    });

    console.log('\n🎉 Stories database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error during stories seeding:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await connectDatabase();
    await seedStories();
    console.log('\n✅ Stories seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Stories seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { seedStories, connectDatabase };
