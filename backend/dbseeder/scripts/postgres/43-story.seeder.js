/**
 * 🎥 Story Seeder (Phase 4 - Tier 3)
 * Depends on: User
 */

const models = require('../../../models_sql');

async function seedStories() {
  try {
    const sequelize = models.sequelize || await models.getSequelizeInstance();
    if (!sequelize) throw new Error('Failed to connect to database');

    console.log('🌱 Starting Story seeding...');

    if (models.reinitializeModels) {
      await models.reinitializeModels();
    }

    const Story = models._raw?.Story || models.Story;
    const User = models._raw?.User || models.User;

    if (!Story || !Story.create) throw new Error('Story model not available');
    if (!User || !User.findOne) throw new Error('User model not available');

    const seller = await User.findOne({ where: { username: 'seller1' } });
    const customer = await User.findOne({ where: { username: 'customer1' } });
    const admin = await User.findOne({ where: { username: 'admin1' } });
    
    if (!seller) throw new Error('Seller user not found');

    const storyImages = [
      'https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=500',
      'https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500',
      'https://images.unsplash.com/photo-1564466809058-bf4114d55352?w=500',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500',
      'https://images.unsplash.com/photo-1490562967822-a91fb1ded89c?w=500',
      'https://images.unsplash.com/photo-1552062407-c582193db9ef?w=500'
    ];

    const stories = [
      // Outfit Showcase
      { userId: seller.id, mediaUrl: storyImages[0], mediaType: 'image', caption: '✨ NEW COLLECTION ALERT! 🚀 Swipe to see our latest launches', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[1], mediaType: 'image', caption: '👗 Summer Vibes Are Here! Perfect for beach getaways 🏖️', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[2], mediaType: 'image', caption: 'Casual Friday Fit 💁‍♀️ Link in bio to shop', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[3], mediaType: 'image', caption: 'Formal Events Sorted! 🎩 Get the full look now', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[4], mediaType: 'image', caption: 'Street Style Inspiration 🛍️ Which one is your fav?', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[5], mediaType: 'image', caption: 'Trending Now: Oversized Blazers 💼 Smart & Chic', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[6], mediaType: 'image', caption: 'Denim Edition 👖 Classic meets Modern', contentType: 'outfit_showcase' },
      { userId: seller.id, mediaUrl: storyImages[7], mediaType: 'image', caption: 'Monochrome Magic ⚫⚪ Timeless elegance', contentType: 'outfit_showcase' },

      // Product Feature
      { userId: seller.id, mediaUrl: storyImages[0], mediaType: 'image', caption: '🌟 Product Spotlight: Premium Cotton Tees NOW 50% OFF! Limited stock 🔥', contentType: 'product_feature' },
      { userId: seller.id, mediaUrl: storyImages[1], mediaType: 'image', caption: '👜 NEW: Summer Collection Handbags | Eco-friendly materials ♻️', contentType: 'product_feature' },
      { userId: seller.id, mediaUrl: storyImages[2], mediaType: 'image', caption: '⌚ Luxury Watches | Premium quality at best prices ✨', contentType: 'product_feature' },
      { userId: seller.id, mediaUrl: storyImages[3], mediaType: 'image', caption: '👠 Exclusive Footwear Collection | Comfort meets Style 👣', contentType: 'product_feature' },
      { userId: seller.id, mediaUrl: storyImages[4], mediaType: 'image', caption: '🧣 Premium Scarves | Perfect for every season 🎀', contentType: 'product_feature' },
      { userId: seller.id, mediaUrl: storyImages[5], mediaType: 'image', caption: '💍 Accessories Galore | Elevate your look instantly ✨', contentType: 'product_feature' },

      // Behind the Scenes
      { userId: seller.id, mediaUrl: storyImages[6], mediaType: 'image', caption: '🎬 Behind the Scenes: Our photo shoot today! 📸 Making magic happen', contentType: 'behind_the_scenes' },
      { userId: seller.id, mediaUrl: storyImages[7], mediaType: 'image', caption: 'Meet Our Team! 👥 The creative minds behind your fav styles 🎨', contentType: 'behind_the_scenes' },
      { userId: seller.id, mediaUrl: storyImages[0], mediaType: 'image', caption: '🏭 Quality Check: Every piece is inspected with care 🔍', contentType: 'behind_the_scenes' },
      { userId: seller.id, mediaUrl: storyImages[1], mediaType: 'image', caption: 'Packing with Love 📦💕 Your order gets special treatment', contentType: 'behind_the_scenes' },

      // Promo
      { userId: seller.id, mediaUrl: storyImages[2], mediaType: 'image', caption: '🎉 MEGA SALE ALERT! 70% OFF on selected items TODAY ONLY ⏰', contentType: 'promo' },
      { userId: seller.id, mediaUrl: storyImages[3], mediaType: 'image', caption: '🎁 Free Shipping on orders above ₹500 | Use code: FRESHLOOK at checkout', contentType: 'promo' },
      { userId: seller.id, mediaUrl: storyImages[4], mediaType: 'image', caption: '💳 Premium Members Get 20% Extra Discount! Join now & save big 💰', contentType: 'promo' },
      { userId: seller.id, mediaUrl: storyImages[5], mediaType: 'image', caption: 'Flash Deal: Designer Labels 50% OFF | Valid for next 24 hrs ⚡', contentType: 'promo' },
      { userId: seller.id, mediaUrl: storyImages[6], mediaType: 'image', caption: 'Bundle & Save! Buy 2 Get 1 FREE on select categories 🛒', contentType: 'promo' },
      { userId: seller.id, mediaUrl: storyImages[7], mediaType: 'image', caption: 'Referral Bonus: Earn ₹500 for every friend you refer 👫 Limited time!', contentType: 'promo' }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i];
      story.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      try {
        await Story.create(story);
        console.log(`✅ [${i + 1}/${stories.length}] Created story: "${story.caption}"`);
        createdCount++;
      } catch (err) {
        console.warn(`⚠️ [${i + 1}/${stories.length}] Story creation skipped: ${err.message}`);
        skippedCount++;
      }
    }

    console.log(`\n✨ Story seeding completed!`);
    console.log(`📊 Created: ${createdCount} | Skipped: ${skippedCount} | Total: ${stories.length}\n`);
    return true;
  } catch (error) {
    console.error('❌ Story seeding failed:', error.message);
    throw error;
  }
}

module.exports = { seedStories };
