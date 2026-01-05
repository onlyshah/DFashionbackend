const models = require('../models');
const Product = models.Product;
const User = models.User;

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      category = '',
      subcategory = '',
      brand = '',
      minPrice = '',
      maxPrice = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = 'true',
      isApproved = 'true',
      isFeatured = ''
    } = req.query;

    // Build filter
    const filter = {};

    // Public users only see active and approved products
    if (req.user?.role !== 'admin' && req.user?.role !== 'sales') {
      filter.isActive = true;
      filter.isApproved = true;
    } else {
      // Admin can filter by status
      if (isActive !== '') filter.isActive = isActive === 'true';
      if (isApproved !== '') filter.isApproved = isApproved === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand) filter.brand = brand;
    if (isFeatured !== '') filter.isFeatured = isFeatured === 'true';

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get products
    const products = await Product.find(filter)
      .populate('vendor', 'fullName username businessName')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const totalProducts = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProducts / parseInt(limit)),
          totalProducts,
          hasNextPage: parseInt(page) < Math.ceil(totalProducts / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'fullName username businessName avatar')
      .populate('reviews.user', 'fullName username avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment view count
    product.analytics.views += 1;
    await product.save();

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Vendor/Admin)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discountPrice,
      category,
      subcategory,
      brand,
      images,
      colors,
      sizes,
      tags,
      inventory,
      specifications
    } = req.body;

    // Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Set vendor
    let vendorId = req.user.userId;
    if (req.user.role === 'admin' || req.user.role === 'sales') {
      // Admin can create products for any vendor
      vendorId = req.body.vendor || req.user.userId;
    }

    const productData = {
      name,
      description,
      price,
      discountPrice,
      category,
      subcategory,
      brand,
      images: images || [],
      colors: colors || [],
      sizes: sizes || [],
      tags: tags || [],
      inventory: inventory || { quantity: 0, sku: '', lowStockThreshold: 5 },
      specifications: specifications || {},
      vendor: vendorId,
      isApproved: req.user.role === 'admin' // Admin products are auto-approved
    };

    const product = new Product(productData);
    await product.save();

    // Populate vendor info
    await product.populate('vendor', 'fullName username businessName');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Vendor/Admin)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'sales' && 
        product.vendor.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;
    delete updateData.vendor; // Prevent vendor change

    // If vendor updates product, it needs re-approval (unless admin)
    if (req.user.role !== 'admin' && req.user.role !== 'sales') {
      updateData.isApproved = false;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vendor', 'fullName username businessName');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Vendor/Admin)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'sales' && 
        product.vendor.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

// @desc    Approve/Reject product (Admin only)
// @route   PUT /api/products/:id/approve
// @access  Private/Admin
const approveProduct = async (req, res) => {
  try {
    const { isApproved, rejectionReason } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isApproved = isApproved;
    if (!isApproved && rejectionReason) {
      product.rejectionReason = rejectionReason;
    } else {
      product.rejectionReason = undefined;
    }

    await product.save();

    res.json({
      success: true,
      message: `Product ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: { product }
    });

  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product approval status'
    });
  }
};

// @desc    Toggle featured status (Admin only)
// @route   PUT /api/products/:id/featured
// @access  Private/Admin
const toggleFeatured = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isFeatured = !product.isFeatured;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { product }
    });

  } catch (error) {
    console.error('Toggle featured error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update featured status'
    });
  }
};

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed
    const existingReview = product.reviews.find(
      review => review.user.toString() === req.user.userId
    );

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this product'
      });
    }

    // Add review
    product.reviews.push({
      user: req.user.userId,
      rating,
      comment: comment || ''
    });

    // Update rating average
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating.average = totalRating / product.reviews.length;
    product.rating.count = product.reviews.length;

    await product.save();
    await product.populate('reviews.user', 'fullName username avatar');

    res.status(201).json({
      success: true,
      message: 'Review added successfully',
      data: {
        review: product.reviews[product.reviews.length - 1],
        rating: product.rating
      }
    });

  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Private/Admin
const getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const approvedProducts = await Product.countDocuments({ isApproved: true });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });

    // Products by category
    const productsByCategory = await Product.aggregate([
      { $match: { isActive: true, isApproved: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalProducts,
          active: activeProducts,
          approved: approvedProducts,
          featured: featuredProducts,
          pending: totalProducts - approvedProducts
        },
        byCategory: productsByCategory
      }
    });

  } catch (error) {
    console.error('Get product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product statistics'
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  approveProduct,
  toggleFeatured,
  addReview,
  getProductStats
};
