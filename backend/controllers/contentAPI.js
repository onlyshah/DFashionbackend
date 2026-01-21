const { getModels } = require('../config');
const sqlModels = getModels();
const { Op } = require('sequelize');

// Fallback to MongoDB models if needed
let mongoModels = {};
try {
  mongoModels = require('../models');
} catch (e) {
  console.warn('[contentAPI] MongoDB models not available');
}

// Get models for both SQL and Mongo operations
const Product = mongoModels.Product || (sqlModels._raw?.Product || sqlModels.Product);
const Brand = mongoModels.Brand || (sqlModels._raw?.Brand || sqlModels.Brand);
const User = mongoModels.User || (sqlModels._raw?.User || sqlModels.User);
const StyleInspiration = mongoModels.StyleInspiration || (sqlModels._raw?.StyleInspiration || sqlModels.StyleInspiration);

function paginate(query, page, limit) {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}

exports.getTrending = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await paginate(Product.find({ isTrending: true }), +page, +limit);
  res.json({ data: await products });
};

exports.getFeaturedBrands = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  // Return featured products instead of brands
  const products = await paginate(Product.find({ isFeatured: true, isActive: true }), +page, +limit);
  res.json({ data: await products });
};

exports.getNewArrivals = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await paginate(Product.find({ isNewArrival: true }), +page, +limit);
  res.json({ data: await products });
};

exports.getSuggested = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const products = await paginate(Product.find({ isSuggested: true }), +page, +limit);
  res.json({ data: await products });
};

exports.getInfluencers = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const users = await paginate(User.find({ isInfluencer: true }), +page, +limit);
  res.json({ data: await users });
};

exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    // Try SQL models first (PostgreSQL)
    try {
      const CategoryModel = sqlModels._raw?.Category || sqlModels.Category;
      if (CategoryModel && CategoryModel.findAll) {
        const offset = (page - 1) * limit;
        const { count, rows } = await CategoryModel.findAndCountAll({
          limit: +limit,
          offset: +offset,
          order: [['name', 'ASC']],
          include: [{
            association: 'SubCategories',
            attributes: ['id', 'name'],
            required: false
          }]
        });

        return res.json({
          success: true,
          data: rows.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            subCategories: cat.SubCategories || cat.subcategories || []
          })),
          pagination: {
            total: count,
            page: +page,
            limit: +limit,
            pages: Math.ceil(count / limit)
          }
        });
      }
    } catch (sqlError) {
      console.warn('[getCategories] SQL query failed:', sqlError.message);
    }

    // Fallback to MongoDB if available
    if (mongoModels.Category && mongoModels.Category.find) {
      const categories = await paginate(mongoModels.Category.find({}), +page, +limit);
      return res.json({ 
        success: true,
        data: await categories 
      });
    }

    // No models available
    res.json({
      success: true,
      data: [],
      pagination: { total: 0, page: +page, limit: +limit, pages: 0 }
    });
  } catch (error) {
    console.error('[getCategories] Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// --- Style Inspiration CRUD ---
exports.getStyleInspiration = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const inspirations = await paginate(StyleInspiration.find({}), +page, +limit);
  res.json({ inspirations: await inspirations });
};

exports.createStyleInspiration = async (req, res) => {
  const inspiration = new StyleInspiration(req.body);
  await inspiration.save();
  res.status(201).json({ inspiration });
};

exports.updateStyleInspiration = async (req, res) => {
  const { id } = req.params;
  const updated = await StyleInspiration.findByIdAndUpdate(id, req.body, { new: true });
  res.json({ inspiration: updated });
};

exports.deleteStyleInspiration = async (req, res) => {
  const { id } = req.params;
  await StyleInspiration.findByIdAndDelete(id);
  res.json({ success: true });
};
