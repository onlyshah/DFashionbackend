const RewardService = require('../services/rewardService');
const User = require('../models/User');
const Reward = require('../models/Reward');

/**
 * Get user reward summary
 */
const getRewardSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await RewardService.getUserRewardSummary(userId);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          summary: result.summary,
          recentRewards: result.recentRewards
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('Error fetching reward summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reward summary',
      error: error.message
    });
  }
};

/**
 * Redeem user credits
 */
const redeemCredits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, type, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption amount'
      });
    }
    
    // Define redemption types and their credit costs
    const redemptionTypes = {
      'discount_10': { credits: 100, value: 10, description: '10% discount coupon' },
      'free_shipping': { credits: 250, value: 0, description: 'Free shipping on next order' },
      'store_credit_5': { credits: 500, value: 5, description: '$5 store credit' },
      'store_credit_10': { credits: 1000, value: 10, description: '$10 store credit' },
      'store_credit_25': { credits: 2500, value: 25, description: '$25 store credit' }
    };
    
    const redemption = redemptionTypes[type];
    if (!redemption) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption type'
      });
    }
    
    if (amount !== redemption.credits) {
      return res.status(400).json({
        success: false,
        message: `This redemption requires exactly ${redemption.credits} credits`
      });
    }
    
    const result = await RewardService.redeemCredits(
      userId, 
      amount, 
      description || redemption.description
    );
    
    if (result.success) {
      // Here you would typically create a coupon or store credit
      // For now, we'll just return success
      
      res.json({
        success: true,
        message: result.message,
        data: {
          remainingCredits: result.remainingCredits,
          redemption: {
            type,
            credits: amount,
            value: redemption.value,
            description: redemption.description
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('Error redeeming credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to redeem credits',
      error: error.message
    });
  }
};

/**
 * Award credits manually (admin only)
 */
const awardCreditsManually = async (req, res) => {
  try {
    const { userId, credits, reason } = req.body;
    
    if (!userId || !credits || credits <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or credit amount'
      });
    }
    
    const result = await RewardService.awardCredits(userId, 'manual_award', {
      credits,
      description: reason || 'Manual credit award by admin'
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: `Awarded ${credits} credits to user`,
        data: result
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
  } catch (error) {
    console.error('Error awarding credits manually:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award credits',
      error: error.message
    });
  }
};

/**
 * Get reward leaderboard
 */
const getRewardLeaderboard = async (req, res) => {
  try {
    const { timeRange = 'month', limit = 10 } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
    }
    
    const leaderboard = await Reward.aggregate([
      { $match: { isProcessed: true, ...dateFilter } },
      {
        $group: {
          _id: '$user',
          totalCredits: { $sum: '$credits' },
          rewardCount: { $sum: 1 }
        }
      },
      { $sort: { totalCredits: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalCredits: 1,
          rewardCount: 1,
          'user.username': 1,
          'user.fullName': 1,
          'user.profilePicture': 1
        }
      }
    ]);
    
    res.json({
      success: true,
      data: leaderboard
    });
    
  } catch (error) {
    console.error('Error fetching reward leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
};

/**
 * Get reward analytics for admin
 */
const getRewardAnalytics = async (req, res) => {
  try {
    const { timeRange = 'month' } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case 'week':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
        break;
      case 'month':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
        break;
      case 'year':
        dateFilter = { createdAt: { $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) } };
        break;
    }
    
    const analytics = await Reward.aggregate([
      { $match: { isProcessed: true, ...dateFilter } },
      {
        $group: {
          _id: '$type',
          totalCredits: { $sum: '$credits' },
          count: { $sum: 1 },
          avgCredits: { $avg: '$credits' }
        }
      },
      { $sort: { totalCredits: -1 } }
    ]);
    
    const totalStats = await Reward.aggregate([
      { $match: { isProcessed: true, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalCreditsAwarded: { $sum: '$credits' },
          totalRewards: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          totalCreditsAwarded: 1,
          totalRewards: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        analytics,
        totalStats: totalStats[0] || {
          totalCreditsAwarded: 0,
          totalRewards: 0,
          uniqueUsers: 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching reward analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

/**
 * Generate referral code for user
 */
const generateReferralCode = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user already has a referral code
    if (user.rewards && user.rewards.referralCode) {
      return res.json({
        success: true,
        data: {
          referralCode: user.rewards.referralCode
        }
      });
    }
    
    // Generate new referral code
    const DataValidationService = require('../services/dataValidationService');
    const referralCode = await DataValidationService.generateUniqueReferralCode(user.username);
    
    if (!referralCode) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique referral code'
      });
    }
    
    // Update user with referral code
    if (!user.rewards) {
      user.rewards = {};
    }
    user.rewards.referralCode = referralCode;
    await user.save();
    
    res.json({
      success: true,
      data: {
        referralCode
      }
    });
    
  } catch (error) {
    console.error('Error generating referral code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate referral code',
      error: error.message
    });
  }
};

module.exports = {
  getRewardSummary,
  redeemCredits,
  awardCreditsManually,
  getRewardLeaderboard,
  getRewardAnalytics,
  generateReferralCode
};
