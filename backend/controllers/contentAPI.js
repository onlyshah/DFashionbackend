const models = require('../models');
const Product = models.Product;
const Brand = models.Brand;
const Category = models.Category;
const User = models.User;
const StyleInspiration = models.StyleInspiration;

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
  const { page = 1, limit = 20 } = req.query;
  const categories = await paginate(Category.find({}), +page, +limit);
  res.json({ data: await categories });
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
