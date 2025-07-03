const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Post = require('../models/Post');
const Story = require('../models/Story');

// Analytics Overview
router.get('/overview', async (req, res) => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      lastActive: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
    });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    
    // Calculate revenue
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get top categories
    const topCategories = await Product.aggregate([
      { $group: { 
          _id: '$category', 
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: {
          name: '$_id',
          count: 1,
          revenue: { $multiply: ['$count', '$avgPrice'] },
          _id: 0
        }
      }
    ]);

    // Generate user growth data (last 30 days)
    const userGrowth = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      userGrowth.push({
        date: dateStr,
        users: Math.floor(Math.random() * 50) + 20,
        orders: Math.floor(Math.random() * 20) + 5,
        revenue: Math.floor(Math.random() * 10000) + 5000
      });
    }

    // Search trends (mock data)
    const searchTrends = [
      { query: 'summer dress', count: 1247, trend: 'up' },
      { query: 'casual wear', count: 892, trend: 'stable' },
      { query: 'ethnic wear', count: 634, trend: 'up' },
      { query: 'formal shoes', count: 521, trend: 'down' },
      { query: 'handbags', count: 387, trend: 'up' }
    ];

    // Engagement metrics
    const engagementMetrics = {
      pageViews: 45672,
      sessionDuration: 4.2,
      bounceRate: 32.5,
      clickThroughRate: 2.8
    };

    const analyticsData = {
      totalUsers,
      activeUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      conversionRate: totalUsers > 0 ? (totalOrders / totalUsers * 100) : 0,
      averageOrderValue,
      topCategories,
      userGrowth,
      searchTrends,
      engagementMetrics
    };

    res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics overview',
      error: error.message
    });
  }
});

// Social Media Analytics
router.get('/social-media', async (req, res) => {
  try {
    const socialMetrics = [
      {
        platform: 'Instagram',
        followers: 125000,
        engagement: 8.5,
        reach: 89000,
        impressions: 234000,
        mentions: 1247,
        sentiment: 'positive',
        topPosts: [
          { id: '1', content: 'Summer collection launch', likes: 2847, shares: 234, comments: 156 },
          { id: '2', content: 'Behind the scenes', likes: 1923, shares: 189, comments: 98 },
          { id: '3', content: 'Customer spotlight', likes: 1654, shares: 145, comments: 87 }
        ]
      },
      {
        platform: 'Facebook',
        followers: 89000,
        engagement: 6.2,
        reach: 67000,
        impressions: 178000,
        mentions: 892,
        sentiment: 'positive',
        topPosts: [
          { id: '1', content: 'New arrivals showcase', likes: 1847, shares: 167, comments: 123 },
          { id: '2', content: 'Style tips and tricks', likes: 1234, shares: 134, comments: 89 },
          { id: '3', content: 'Flash sale announcement', likes: 987, shares: 98, comments: 67 }
        ]
      }
    ];

    res.json({
      success: true,
      data: socialMetrics
    });

  } catch (error) {
    console.error('Social media analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media analytics',
      error: error.message
    });
  }
});

// Search Engine Analytics
router.get('/search-engine', async (req, res) => {
  try {
    const searchData = {
      keywords: [
        { keyword: 'online fashion store', position: 3, searchVolume: 12000, difficulty: 65, trend: 'up' },
        { keyword: 'women clothing', position: 7, searchVolume: 8900, difficulty: 72, trend: 'stable' },
        { keyword: 'ethnic wear online', position: 5, searchVolume: 5600, difficulty: 58, trend: 'up' },
        { keyword: 'designer clothes', position: 12, searchVolume: 4300, difficulty: 78, trend: 'down' },
        { keyword: 'fashion accessories', position: 8, searchVolume: 3200, difficulty: 62, trend: 'stable' }
      ],
      organicTraffic: 23456,
      clickThroughRate: 3.2,
      averagePosition: 7.2,
      impressions: 156789,
      clicks: 5023
    };

    res.json({
      success: true,
      data: searchData
    });

  } catch (error) {
    console.error('Search engine analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch search engine analytics',
      error: error.message
    });
  }
});

// Competitor Analysis
router.get('/competitors', async (req, res) => {
  try {
    const competitorData = [
      {
        competitor: 'Myntra',
        marketShare: 28.5,
        priceComparison: 105,
        trafficEstimate: 2500000,
        topKeywords: ['online fashion', 'ethnic wear', 'designer clothes'],
        socialFollowing: 1200000,
        engagementRate: 6.8
      },
      {
        competitor: 'Ajio',
        marketShare: 18.2,
        priceComparison: 98,
        trafficEstimate: 1800000,
        topKeywords: ['trendy fashion', 'casual wear', 'footwear'],
        socialFollowing: 890000,
        engagementRate: 5.4
      },
      {
        competitor: 'Nykaa Fashion',
        marketShare: 12.7,
        priceComparison: 112,
        trafficEstimate: 1200000,
        topKeywords: ['beauty fashion', 'luxury brands', 'accessories'],
        socialFollowing: 650000,
        engagementRate: 7.2
      }
    ];

    res.json({
      success: true,
      data: competitorData
    });

  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch competitor analysis',
      error: error.message
    });
  }
});

// Data Scraping Endpoints
router.post('/scrape/instagram', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Mock Instagram scraping data
    const instagramData = {
      username,
      followers: Math.floor(Math.random() * 100000) + 10000,
      following: Math.floor(Math.random() * 1000) + 100,
      posts: Math.floor(Math.random() * 500) + 50,
      engagementRate: (Math.random() * 10 + 2).toFixed(2),
      avgLikes: Math.floor(Math.random() * 5000) + 500,
      avgComments: Math.floor(Math.random() * 200) + 20,
      scrapedAt: new Date()
    };

    res.json({
      success: true,
      data: instagramData
    });

  } catch (error) {
    console.error('Instagram scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scrape Instagram data',
      error: error.message
    });
  }
});

router.post('/scrape/google-trends', async (req, res) => {
  try {
    const { keyword } = req.body;
    
    // Mock Google Trends data
    const trendsData = {
      keyword,
      interest: Math.floor(Math.random() * 100) + 1,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
      relatedQueries: [
        `${keyword} online`,
        `${keyword} price`,
        `${keyword} reviews`,
        `best ${keyword}`,
        `${keyword} sale`
      ],
      scrapedAt: new Date()
    };

    res.json({
      success: true,
      data: trendsData
    });

  } catch (error) {
    console.error('Google Trends scraping error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to scrape Google Trends data',
      error: error.message
    });
  }
});

// User Behavior Tracking
router.post('/track', async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;
    
    // In a real app, you would save this to a database
    console.log('User behavior tracked:', { event, data, timestamp });
    
    res.json({
      success: true,
      message: 'User behavior tracked successfully'
    });

  } catch (error) {
    console.error('User behavior tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track user behavior',
      error: error.message
    });
  }
});

module.exports = router;
