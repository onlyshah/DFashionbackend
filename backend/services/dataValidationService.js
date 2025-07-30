const User = require('../models/User');
const Role = require('../models/Role');
const Product = require('../models/Product');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Reel = require('../models/Reel');
const Category = require('../models/Category');

class DataValidationService {
  
  /**
   * Check if user already exists by email, username, or employeeId
   */
  static async checkUserExists(userData) {
    const query = {
      $or: []
    };
    
    if (userData.email) {
      query.$or.push({ email: userData.email.toLowerCase() });
    }
    
    if (userData.username) {
      query.$or.push({ username: userData.username.toLowerCase() });
    }
    
    if (userData.employeeId) {
      query.$or.push({ employeeId: userData.employeeId });
    }
    
    if (query.$or.length === 0) {
      return { exists: false };
    }
    
    const existingUser = await User.findOne(query);
    
    return {
      exists: !!existingUser,
      user: existingUser,
      conflictFields: this.getConflictFields(userData, existingUser)
    };
  }
  
  /**
   * Check if role already exists by name
   */
  static async checkRoleExists(roleName) {
    const existingRole = await Role.findOne({ 
      name: roleName.toLowerCase() 
    });
    
    return {
      exists: !!existingRole,
      role: existingRole
    };
  }
  
  /**
   * Check if product already exists by SKU, name, or vendor combination
   */
  static async checkProductExists(productData) {
    const query = {
      $or: []
    };
    
    if (productData.sku) {
      query.$or.push({ sku: productData.sku });
    }
    
    if (productData.name && productData.vendor) {
      query.$or.push({ 
        name: productData.name,
        vendor: productData.vendor 
      });
    }
    
    if (query.$or.length === 0) {
      return { exists: false };
    }
    
    const existingProduct = await Product.findOne(query);
    
    return {
      exists: !!existingProduct,
      product: existingProduct
    };
  }
  
  /**
   * Check if category already exists by name
   */
  static async checkCategoryExists(categoryName) {
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    });
    
    return {
      exists: !!existingCategory,
      category: existingCategory
    };
  }
  
  /**
   * Validate content creation requirements
   */
  static async validateContentCreation(contentData, userId) {
    const errors = [];
    
    // Check if user is logged in
    if (!userId) {
      errors.push('User must be logged in to create content');
    }
    
    // Check if products are tagged (mandatory)
    if (!contentData.products || contentData.products.length === 0) {
      errors.push('Content must have at least one tagged product');
    }
    
    // Validate tagged products exist
    if (contentData.products && contentData.products.length > 0) {
      for (const productTag of contentData.products) {
        const productExists = await Product.findById(productTag.product);
        if (!productExists) {
          errors.push(`Product with ID ${productTag.product} does not exist`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate purchase requirements
   */
  static async validatePurchase(purchaseData, userId) {
    const errors = [];
    
    // Check if user is logged in
    if (!userId) {
      errors.push('User must be logged in to make purchases');
    }
    
    // Validate user exists and is active
    const user = await User.findById(userId);
    if (!user) {
      errors.push('User not found');
    } else if (!user.isActive) {
      errors.push('User account is deactivated');
    }
    
    // Validate products exist and are available
    if (purchaseData.items && purchaseData.items.length > 0) {
      for (const item of purchaseData.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          errors.push(`Product with ID ${item.product} does not exist`);
        } else if (!product.isActive) {
          errors.push(`Product ${product.name} is not available`);
        } else if (product.stock < item.quantity) {
          errors.push(`Insufficient stock for product ${product.name}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get conflict fields between new data and existing data
   */
  static getConflictFields(newData, existingData) {
    if (!existingData) return [];
    
    const conflicts = [];
    
    if (newData.email && existingData.email === newData.email.toLowerCase()) {
      conflicts.push('email');
    }
    
    if (newData.username && existingData.username === newData.username.toLowerCase()) {
      conflicts.push('username');
    }
    
    if (newData.employeeId && existingData.employeeId === newData.employeeId) {
      conflicts.push('employeeId');
    }
    
    return conflicts;
  }
  
  /**
   * Validate role permissions for action
   */
  static async validateRolePermissions(userId, action, resource) {
    const user = await User.findById(userId).populate('role');
    
    if (!user) {
      return { hasPermission: false, error: 'User not found' };
    }
    
    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return { hasPermission: true };
    }
    
    // Define role-based permissions
    const rolePermissions = {
      'admin': {
        users: ['create', 'read', 'update'],
        products: ['create', 'read', 'update', 'delete'],
        orders: ['read', 'update'],
        content: ['read', 'update', 'delete']
      },
      'vendor': {
        products: ['create', 'read', 'update'],
        orders: ['read'],
        content: ['create', 'read', 'update']
      },
      'end_user': {
        content: ['create', 'read'],
        orders: ['create', 'read']
      }
    };
    
    const userPermissions = rolePermissions[user.role] || {};
    const resourcePermissions = userPermissions[resource] || [];
    
    return {
      hasPermission: resourcePermissions.includes(action),
      error: !resourcePermissions.includes(action) ? 'Insufficient permissions' : null
    };
  }
  
  /**
   * Generate unique referral code
   */
  static async generateUniqueReferralCode(username) {
    let referralCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      referralCode = `${username.substring(0, 4).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const existingUser = await User.findOne({ 'rewards.referralCode': referralCode });
      isUnique = !existingUser;
      attempts++;
    }
    
    return isUnique ? referralCode : null;
  }
}

module.exports = DataValidationService;
