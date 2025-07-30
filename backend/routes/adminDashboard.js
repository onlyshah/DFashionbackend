const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAdminToken, requirePermission, requireRole, requireDepartment } = require('../middleware/adminAuth');

// Apply admin authentication to all routes
router.use(verifyAdminToken);

// Dashboard Routes
router.get('/dashboard/stats', 
  requirePermission('dashboard', 'view'),
  adminController.getDashboardStats
);

router.get('/analytics', 
  requirePermission('dashboard', 'analytics'),
  adminController.getAnalytics
);

// User Management Routes
router.get('/users', 
  requirePermission('users', 'view'),
  adminController.getAllUsers
);

router.post('/users', 
  requirePermission('users', 'create'),
  requireRole('admin'),
  adminController.createAdminUser
);

router.put('/users/:userId/role', 
  requirePermission('users', 'roles'),
  requireRole('admin'),
  adminController.updateUserRole
);

// Department-specific dashboards
router.get('/departments/sales/dashboard', 
  requireDepartment(['sales', 'administration']),
  (req, res) => {
    res.json({
      success: true,
      data: {
        department: 'Sales',
        metrics: {
          leads_today: 45,
          conversions: 12,
          revenue_today: 125000,
          target_achievement: 85.5,
          team_performance: [
            { name: 'Raj Kumar', sales: 15, target: 20, achievement: 75 },
            { name: 'Priya Singh', sales: 22, target: 25, achievement: 88 },
            { name: 'Amit Sharma', sales: 18, target: 20, achievement: 90 }
          ]
        },
        recent_activities: [
          { type: 'lead_converted', message: 'High-value lead converted: ₹50,000', time: '2 hours ago' },
          { type: 'target_achieved', message: 'Monthly target 85% achieved', time: '4 hours ago' }
        ]
      }
    });
  }
);

router.get('/departments/marketing/dashboard', 
  requireDepartment(['marketing', 'administration']),
  (req, res) => {
    res.json({
      success: true,
      data: {
        department: 'Marketing',
        metrics: {
          campaigns_active: 7,
          reach_today: 25000,
          engagement_rate: 4.2,
          cost_per_acquisition: 340,
          campaign_performance: [
            { name: 'Summer Collection', reach: 15000, engagement: 5.2, conversions: 45 },
            { name: 'Festive Offers', reach: 12000, engagement: 4.8, conversions: 38 },
            { name: 'New Arrivals', reach: 8000, engagement: 3.5, conversions: 22 }
          ]
        },
        recent_activities: [
          { type: 'campaign_launched', message: 'New campaign "Monsoon Special" launched', time: '1 hour ago' },
          { type: 'engagement_spike', message: 'Instagram engagement increased by 25%', time: '3 hours ago' }
        ]
      }
    });
  }
);

router.get('/departments/support/dashboard', 
  requireDepartment(['support', 'administration']),
  (req, res) => {
    res.json({
      success: true,
      data: {
        department: 'Support',
        metrics: {
          tickets_open: 23,
          tickets_resolved_today: 18,
          avg_resolution_time: 3.2,
          satisfaction_rate: 94.5,
          agent_performance: [
            { name: 'Sneha Patel', tickets_resolved: 12, avg_time: 2.8, rating: 4.8 },
            { name: 'Rohit Gupta', tickets_resolved: 15, avg_time: 3.1, rating: 4.6 },
            { name: 'Kavya Reddy', tickets_resolved: 10, avg_time: 2.5, rating: 4.9 }
          ]
        },
        recent_activities: [
          { type: 'ticket_resolved', message: 'Critical ticket resolved in 45 minutes', time: '30 minutes ago' },
          { type: 'satisfaction_high', message: 'Customer satisfaction above 95%', time: '2 hours ago' }
        ]
      }
    });
  }
);

router.get('/departments/accounting/dashboard', 
  requireDepartment(['accounting', 'administration']),
  (req, res) => {
    res.json({
      success: true,
      data: {
        department: 'Accounting',
        metrics: {
          pending_invoices: 45,
          processed_today: 67,
          outstanding_amount: 450000,
          collection_rate: 92.5,
          financial_summary: {
            revenue_this_month: 1850000,
            expenses_this_month: 1200000,
            profit_margin: 35.1,
            tax_liability: 185000
          }
        },
        recent_activities: [
          { type: 'payment_received', message: 'Large payment received: ₹2,50,000', time: '1 hour ago' },
          { type: 'invoice_processed', message: '25 invoices processed successfully', time: '3 hours ago' }
        ]
      }
    });
  }
);

// Role Management Routes
router.get('/roles', 
  requireRole('admin'),
  (req, res) => {
    const roles = [
      {
        id: 'super_admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        department: 'administration',
        level: 10,
        users_count: 1
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access with most permissions',
        department: 'administration',
        level: 9,
        users_count: 2
      },
      {
        id: 'sales_manager',
        name: 'Sales Manager',
        description: 'Manages sales team and operations',
        department: 'sales',
        level: 7,
        users_count: 3
      },
      {
        id: 'marketing_manager',
        name: 'Marketing Manager',
        description: 'Manages marketing campaigns and content',
        department: 'marketing',
        level: 7,
        users_count: 2
      },
      {
        id: 'account_manager',
        name: 'Account Manager',
        description: 'Manages financial operations and accounting',
        department: 'accounting',
        level: 7,
        users_count: 2
      },
      {
        id: 'support_manager',
        name: 'Support Manager',
        description: 'Manages customer support operations',
        department: 'support',
        level: 7,
        users_count: 1
      }
    ];

    res.json({
      success: true,
      data: { roles }
    });
  }
);

// Team Management Routes - REAL DATA ONLY
router.get('/team',
  requirePermission('users', 'view'),
  async (req, res) => {
    try {
      // Get real team members from database
      const User = require('../models/User');
      const teamMembers = await User.find({
        role: { $in: ['super_admin', 'admin', 'sales_manager', 'marketing_manager', 'support_agent'] }
      }).select('fullName email role isActive lastLogin createdAt').lean();

      const formattedTeamMembers = teamMembers.map(member => ({
        id: member._id,
        name: member.fullName,
        email: member.email,
        role: member.role,
        department: getDepartmentFromRole(member.role),
        status: member.isActive ? 'active' : 'inactive',
        last_login: member.lastLogin || member.createdAt,
        permissions: getRolePermissions(member.role)
      }));

      res.json({
        success: true,
        data: formattedTeamMembers
      });
    } catch (error) {
      console.error('Error fetching team members:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch team members',
        error: error.message
      });
    }
  }
);

// Helper functions
function getDepartmentFromRole(role) {
  const roleDepartmentMap = {
    'super_admin': 'administration',
    'admin': 'administration',
    'sales_manager': 'sales',
    'marketing_manager': 'marketing',
    'support_agent': 'support'
  };
  return roleDepartmentMap[role] || 'general';
}

function getRolePermissions(role) {
  const rolePermissionsMap = {
    'super_admin': ['all'],
    'admin': ['dashboard.view', 'users.view', 'products.manage', 'orders.manage'],
    'sales_manager': ['dashboard.view', 'orders.view', 'orders.edit'],
    'marketing_manager': ['dashboard.view', 'analytics.view', 'campaigns.manage'],
    'support_agent': ['dashboard.view', 'orders.view', 'users.view']
  };
  return rolePermissionsMap[role] || [];
}
      {
        id: '3',
        name: 'Priya Marketing',
        email: 'priya.marketing@dfashion.com',
        role: 'marketing_manager',
        department: 'marketing',
        status: 'active',
        last_login: new Date(Date.now() - 60 * 60 * 1000),
        permissions: ['dashboard.view', 'marketing.campaigns', 'marketing.content']
      },
      {
        id: '4',
        name: 'Amit Accounts',
        email: 'amit.accounts@dfashion.com',
        role: 'account_manager',
        department: 'accounting',
        status: 'active',
        last_login: new Date(Date.now() - 4 * 60 * 60 * 1000),
        permissions: ['dashboard.view', 'finance.view', 'finance.reports']
      },
      {
        id: '5',
        name: 'Sneha Support',
        email: 'sneha.support@dfashion.com',
        role: 'support_manager',
        department: 'support',
        status: 'active',
        last_login: new Date(Date.now() - 45 * 60 * 1000),
        permissions: ['dashboard.view', 'support.tickets', 'support.chat']
      }
    ];

    res.json({
      success: true,
      data: { team_members: teamMembers }
    });
  }
);

// User Profile and Permissions
router.get('/profile', (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions || [],
        last_login: user.lastLogin,
        avatar: user.avatar
      }
    }
  });
});

router.get('/permissions', (req, res) => {
  const userRole = req.user.role;
  
  // Get permissions based on role
  const rolePermissions = {
    super_admin: ['all'],
    admin: ['dashboard.*', 'users.*', 'products.*', 'orders.*', 'settings.*'],
    sales_manager: ['dashboard.view', 'dashboard.analytics', 'orders.*', 'users.view'],
    sales_executive: ['dashboard.view', 'orders.view', 'orders.edit'],
    marketing_manager: ['dashboard.view', 'dashboard.analytics', 'marketing.*', 'products.view'],
    marketing_executive: ['dashboard.view', 'marketing.campaigns', 'marketing.content'],
    account_manager: ['dashboard.view', 'dashboard.analytics', 'finance.*', 'orders.view'],
    accountant: ['dashboard.view', 'finance.view', 'finance.reports'],
    support_manager: ['dashboard.view', 'support.*', 'users.view'],
    support_agent: ['dashboard.view', 'support.tickets', 'support.chat']
  };

  res.json({
    success: true,
    data: {
      role: userRole,
      permissions: rolePermissions[userRole] || ['dashboard.view']
    }
  });
});

module.exports = router;
