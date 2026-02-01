const ServiceLoader = require('../services/ServiceLoader');
const rewardService = ServiceLoader.loadService('rewardService');

class RewardController {
  /**
   * Get trending rewards
   * GET /trending
   */
  static async getTrendingRewards(req, res) {
    try {
      const { limit = 10 } = req.query;
      return res.json({
        success: true,
        data: [],
        message: 'Trending rewards retrieved'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch trending rewards',
        error: error.message
      });
    }
  }

  /**
   * Get random reward
   * GET /random
   */
  static async getRandomReward(req, res) {
    try {
      return res.json({
        success: true,
        data: null,
        message: 'Random reward retrieved'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch random reward',
        error: error.message
      });
    }
  }

  /**
   * Get user rewards
   * GET /user-rewards
   */
  static async getUserRewards(req, res) {
    try {
      const userId = req.user.id;
      return res.json({
        success: true,
        data: [],
        message: 'User rewards retrieved'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user rewards',
        error: error.message
      });
    }
  }

  /**
   * Get reward details
   * GET /:id
   */
  static async getRewardDetails(req, res) {
    try {
      const { id } = req.params;
      return res.json({
        success: true,
        data: null,
        message: 'Reward details retrieved'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reward details',
        error: error.message
      });
    }
  }

  /**
   * Claim reward
   * POST /claim/:id
   */
  static async claimReward(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      return res.json({
        success: true,
        data: { rewardId: id, userId, claimed: true },
        message: 'Reward claimed successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to claim reward',
        error: error.message
      });
    }
  }

  /**
   * Redeem reward
   * GET /redeem/:id
   */
  static async redeemReward(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      return res.json({
        success: true,
        data: { rewardId: id, userId, redeemed: true },
        message: 'Reward redeemed successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to redeem reward',
        error: error.message
      });
    }
  }

  /**
   * Create reward
   * POST /create
   */
  static async createReward(req, res) {
    try {
      const { name, description, credits, type } = req.body;
      return res.status(201).json({
        success: true,
        data: { name, description, credits, type },
        message: 'Reward created successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create reward',
        error: error.message
      });
    }
  }

  /**
   * Update reward
   * PUT /:id
   */
  static async updateReward(req, res) {
    try {
      const { id } = req.params;
      const { name, description, credits, type } = req.body;
      return res.json({
        success: true,
        data: { id, name, description, credits, type },
        message: 'Reward updated successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update reward',
        error: error.message
      });
    }
  }

  /**
   * Delete reward
   * DELETE /:id
   */
  static async deleteReward(req, res) {
    try {
      const { id } = req.params;
      return res.json({
        success: true,
        message: 'Reward deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete reward',
        error: error.message
      });
    }
  }
}

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
    const ServiceLoader = require('../services/ServiceLoader');
    const DataValidationService = require('../services/utils/dataValidationService');
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
  // Static methods from RewardController class
  getUserRewards: RewardController.getUserRewards,
  getRewardDetails: RewardController.getRewardDetails,
  claimReward: RewardController.claimReward,
  redeemReward: RewardController.redeemReward,
  createReward: RewardController.createReward,
  updateReward: RewardController.updateReward,
  deleteReward: RewardController.deleteReward,
  // Other exported functions
  getRewardSummary,
  redeemCredits,
  awardCreditsManually,
  getRewardLeaderboard,
  getRewardAnalytics,
  generateReferralCode
};
