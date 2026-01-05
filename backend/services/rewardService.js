const { getModels } = require('../config');
const models = getModels();
const User = models.User;
const Reward = models.Reward;
const Order = models.Order;
const Post = models.Post;
const Story = models.Story;
const Reel = models.Reel;

class RewardService {
  
  /**
   * Award credits for user actions
   */
  static async awardCredits(userId, type, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const credits = Reward.getRewardCredits(type, metadata);
      if (credits <= 0) {
        return { success: false, message: 'No credits awarded for this action' };
      }
      
      // Create reward record
      const reward = new Reward({
        user: userId,
        type,
        credits,
        description: this.getRewardDescription(type, metadata),
        sourceUser: metadata.sourceUser,
        sourceContent: metadata.sourceContent,
        order: metadata.order,
        metadata
      });
      
      await reward.save();
      
      // Process the reward (update user credits)
      const processed = await reward.processReward();
      
      if (processed) {
        // Send notification about reward
        await this.sendRewardNotification(userId, type, credits);
        
        return {
          success: true,
          credits,
          message: `Earned ${credits} credits for ${type.replace('_', ' ')}`
        };
      }
      
      return { success: false, message: 'Failed to process reward' };
      
    } catch (error) {
      console.error('Error awarding credits:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Handle purchase-based rewards
   */
  static async handlePurchaseReward(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('user')
        .populate('items.product');
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      // Award credits to buyer (2% of purchase amount)
      await this.awardCredits(order.user._id, 'product_purchase', {
        purchaseAmount: order.total,
        order: orderId
      });
      
      // Award credits to content creators who influenced the purchase
      await this.handleInfluencerRewards(order);
      
      // Award referral credits if applicable
      if (order.user.rewards && order.user.rewards.referredBy) {
        await this.awardCredits(order.user.rewards.referredBy, 'referral_purchase', {
          purchaseAmount: order.total,
          order: orderId
        });
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling purchase reward:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Handle influencer rewards for content that led to purchases
   */
  static async handleInfluencerRewards(order) {
    try {
      // Check if purchase came from a specific post/story/reel
      if (order.sourceContent) {
        const { contentType, contentId } = order.sourceContent;
        
        let content;
        switch (contentType) {
          case 'post':
            content = await Post.findById(contentId).populate('user');
            break;
          case 'story':
            content = await Story.findById(contentId).populate('user');
            break;
          case 'reel':
            content = await Reel.findById(contentId).populate('user');
            break;
        }
        
        if (content && content.user) {
          // Award 5% of purchase amount to content creator
          const influencerCredits = Math.floor(order.total * 0.05);
          
          await this.awardCredits(content.user._id, 'referral_purchase', {
            purchaseAmount: order.total,
            sourceUser: order.user._id,
            sourceContent: { contentType, contentId },
            order: order._id
          });
          
          // Update content engagement stats
          await this.updateContentEngagement(contentType, contentId, {
            purchasesGenerated: 1,
            revenueGenerated: order.total
          });
        }
      }
      
    } catch (error) {
      console.error('Error handling influencer rewards:', error);
    }
  }
  
  /**
   * Update content engagement statistics
   */
  static async updateContentEngagement(contentType, contentId, stats) {
    try {
      let Model;
      switch (contentType) {
        case 'post':
          Model = Post;
          break;
        case 'story':
          Model = Story;
          break;
        case 'reel':
          Model = Reel;
          break;
        default:
          return;
      }
      
      await Model.findByIdAndUpdate(contentId, {
        $inc: {
          'engagement.purchasesGenerated': stats.purchasesGenerated || 0,
          'engagement.revenueGenerated': stats.revenueGenerated || 0,
          'engagement.clickThroughs': stats.clickThroughs || 0
        }
      });
      
    } catch (error) {
      console.error('Error updating content engagement:', error);
    }
  }
  
  /**
   * Redeem user credits
   */
  static async redeemCredits(userId, amount, description = 'Credit redemption') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.rewards || user.rewards.availableCredits < amount) {
        throw new Error('Insufficient credits');
      }
      
      // Update user credits
      user.rewards.availableCredits -= amount;
      user.rewards.usedCredits += amount;
      await user.save();
      
      // Create redemption record
      const redemption = new Reward({
        user: userId,
        type: 'credit_redemption',
        credits: -amount,
        description,
        isProcessed: true,
        processedAt: new Date()
      });
      
      await redemption.save();
      
      return {
        success: true,
        remainingCredits: user.rewards.availableCredits,
        message: `Redeemed ${amount} credits`
      };
      
    } catch (error) {
      console.error('Error redeeming credits:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Get user reward summary
   */
  static async getUserRewardSummary(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const recentRewards = await Reward.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('sourceUser', 'username fullName');
      
      return {
        success: true,
        summary: {
          totalCredits: user.rewards?.totalCredits || 0,
          availableCredits: user.rewards?.availableCredits || 0,
          usedCredits: user.rewards?.usedCredits || 0,
          totalEarnings: user.rewards?.totalEarnings || 0,
          referralCode: user.rewards?.referralCode,
          referralCount: user.rewards?.referralCount || 0
        },
        recentRewards
      };
      
    } catch (error) {
      console.error('Error getting reward summary:', error);
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Generate reward description
   */
  static getRewardDescription(type, metadata = {}) {
    const descriptions = {
      'post_like': 'Liked a post',
      'post_share': 'Shared a post',
      'post_comment': 'Commented on a post',
      'story_view': 'Viewed a story',
      'reel_view': 'Viewed a reel',
      'product_purchase': `Made a purchase of $${metadata.purchaseAmount || 0}`,
      'referral_signup': 'Referred a new user',
      'referral_purchase': `Referral made a purchase of $${metadata.purchaseAmount || 0}`,
      'content_creation': 'Created new content',
      'daily_login': 'Daily login bonus',
      'profile_completion': 'Completed profile',
      'first_purchase': 'First purchase bonus',
      'review_submission': 'Submitted a product review'
    };
    
    return descriptions[type] || 'Earned credits';
  }
  
  /**
   * Send reward notification
   */
  static async sendRewardNotification(userId, type, credits) {
    try {
      // Implementation would depend on your notification service
      console.log(`Reward notification: User ${userId} earned ${credits} credits for ${type}`);
      
      // You can integrate with your notification service here
      // await NotificationService.send(userId, {
      //   type: 'reward',
      //   title: 'Credits Earned!',
      //   message: `You earned ${credits} credits for ${type.replace('_', ' ')}`,
      //   data: { credits, type }
      // });
      
    } catch (error) {
      console.error('Error sending reward notification:', error);
    }
  }
}

module.exports = RewardService;
