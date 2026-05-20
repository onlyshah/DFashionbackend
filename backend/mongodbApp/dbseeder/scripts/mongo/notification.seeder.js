// Notification Seeder
const User = require('../../../models/User');
const Notification = require('../../../models/Notification');

async function seedNotifications() {
  console.log('🔔 Seeding notifications...');
  
  const deletedCount = await Notification.deleteMany({});
  console.log(`   Cleared ${deletedCount.deletedCount} existing notifications`);
  
  const users = await User.find().limit(10);
  
  if (users.length === 0) {
    throw new Error('Users not found');
  }
  
  const notifications = [];
  const notificationTypes = ['follow', 'like', 'comment', 'message', 'order_status', 'promotion'];
  
  users.forEach((user, userIdx) => {
    for (let i = 0; i < 3; i++) {
      const type = notificationTypes[i % notificationTypes.length];
      
      notifications.push({
        user: user._id,
        type,
        title: {
          follow: 'New Follower',
          like: 'Someone liked your post',
          comment: 'New comment on your post',
          message: 'New message received',
          order_status: 'Order status updated',
          promotion: 'Special offer for you'
        }[type],
        message: {
          follow: `${users[(userIdx + i + 1) % users.length].fullName} started following you`,
          like: `${users[(userIdx + i + 1) % users.length].fullName} liked your post`,
          comment: `${users[(userIdx + i + 1) % users.length].fullName} commented on your post`,
          message: 'You have a new message',
          order_status: 'Your order has been shipped',
          promotion: 'Get 20% off on your next purchase'
        }[type],
        image: `/uploads/avatars/default-avatar.svg`,
        isRead: i > 0,
        readAt: i > 0 ? new Date(Date.now() - i * 3600000) : null
      });
    }
  });
  
  const result = await Notification.insertMany(notifications);
  console.log(`   ✅ Created ${result.length} notifications`);
  
  return result;
}

module.exports = seedNotifications;

