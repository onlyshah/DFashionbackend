const dbType = process.env.DB_TYPE || 'mongodb';
const models = dbType.includes('postgres') ? require('../models_sql') : require('../models');
const { createFashionArtwork, slugify } = require('../dbseeder/utils/image-utils');

// Determine if using PostgreSQL
const isPostgres = dbType.includes('postgres');

const DEFAULT_PRODUCT_IMAGE = '/uploads/default-product.svg';
const DEFAULT_BRAND_LOGO = '/uploads/brands/default-brand.png';
const DEFAULT_AVATAR = '/uploads/avatars/default-avatar.svg';

const asPlain = (item) => (item?.toJSON ? item.toJSON() : item) || null;

const attachProductImages = (product, index = 0) => {
  const item = asPlain(product);
  if (!item) return item;

  const title = item.title || item.name || `Product ${index + 1}`;
  const slug = slugify(title);
  const existing = Array.isArray(item.images) && item.images.length > 0 ? item.images : [];
  const images = existing.length > 0
    ? existing
    : item.imageUrl
      ? [{
          url: item.imageUrl,
          alt: title,
          isPrimary: true
        }]
    : [{
        url: createFashionArtwork('products', slug, index + 1, { subtitle: 'New collection' }),
        alt: title,
        isPrimary: true
      }];

  return {
    ...item,
    id: item.id || item._id,
    _id: item._id || item.id,
    images: images.map((image, imageIndex) => ({
      url: image.url || DEFAULT_PRODUCT_IMAGE,
      alt: image.alt || title,
      isPrimary: imageIndex === 0 || !!image.isPrimary
    })),
    image: images[0]?.url || DEFAULT_PRODUCT_IMAGE
  };
};

const attachBrandLogo = (brand, index = 0) => {
  const item = asPlain(brand);
  if (!item) return item;

  const name = item.name || `Brand ${index + 1}`;
  return {
    ...item,
    id: item.id || item._id,
    _id: item._id || item.id,
    logo: item.logo || item.logoUrl || createFashionArtwork('brands', slugify(name), index + 1, {
      subtitle: 'Featured brand',
      width: 720,
      height: 720
    }),
    description: item.description || 'Featured fashion brand',
    isPopular: true
  };
};

const attachCategoryArtwork = (category, index = 0) => {
  const item = asPlain(category);
  if (!item) return item;

  const name = item.name || `Category ${index + 1}`;
  return {
    ...item,
    id: item.id || item._id,
    _id: item._id || item.id,
    image: item.image || createFashionArtwork('categories', item.slug || slugify(name), index + 1, {
      subtitle: name,
      width: 760,
      height: 760
    })
  };
};

const attachInfluencerAvatar = (user, index = 0) => {
  const item = asPlain(user);
  if (!item) return item;

  return {
    ...item,
    id: item.id || item._id,
    _id: item._id || item.id,
    avatar: item.avatar || item.avatar_url || DEFAULT_AVATAR,
    fullName: item.fullName || item.full_name || item.username || `Influencer ${index + 1}`
  };
};

exports.getTrending = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let products;
    let total;

    if (isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['ratings', 'DESC']]
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { ratings: -1, createdAt: -1 }
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    }

    res.json({
      success: true,
      data: products,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getTrending] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFeaturedBrands = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let brands;
    let total;

    if (isPostgres) {
      // PostgreSQL: Get all brands
      try {
        const result = await models.Brand.findAndCountAll({
          limit: +limit,
          offset: +offset,
          order: [['name', 'ASC']]
        });

        brands = result.rows || [];
        total = result.count || 0;
      } catch (pgError) {
        // Fallback: try simpler query
        console.warn('[getFeaturedBrands] findAndCountAll failed, trying findAll:', pgError.message);
        brands = await models.Brand.findAll({
          limit: +limit,
          offset: +offset,
          order: [['name', 'ASC']]
        }) || [];
        total = await models.Brand.count();
      }
    } else {
      // MongoDB: Get all brands
      const result = await models.Brand.findAndCountAll({
        skip: offset,
        limit: +limit,
        sort: { name: 1 }
      });

      brands = result.rows || [];
      total = result.count || 0;
    }

    // Transform to match frontend expectations
    const transformedBrands = brands.map((brand, index) => attachBrandLogo(brand, index));

    res.json({
      success: true,
      data: transformedBrands,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getFeaturedBrands] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getNewArrivals = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let products;
    let total;

    if (isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true },
        limit: +limit,
        offset: +offset
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        skip: offset,
        limit: +limit
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    }

    res.json({
      success: true,
      data: products,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getNewArrivals] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSuggested = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let products;
    let total;

    if (isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['ratings', 'DESC']]
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { ratings: -1, createdAt: -1 }
      });

      products = result.rows.map((product, index) => attachProductImages(product, index));
      total = result.count;
    }

    res.json({
      success: true,
      data: products,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getSuggested] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getInfluencers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const User = models._raw?.User || models.User;

    if (isPostgres) {
      const result = await User.findAndCountAll({
        where: { isInfluencer: true, isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['followersCount', 'DESC']]
      });

      res.json({
        success: true,
        data: result.rows.map((user, index) => attachInfluencerAvatar(user, index)),
        pagination: { page: +page, limit: +limit, total: result.count, pages: Math.ceil(result.count / limit) }
      });
    } else {
      const result = await User.findAndCountAll({
        isInfluencer: true,
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { followersCount: -1 }
      });

      res.json({
        success: true,
        data: result.rows.map((user, index) => attachInfluencerAvatar(user, index)),
        pagination: { page: +page, limit: +limit, total: result.count, pages: Math.ceil(result.count / limit) }
      });
    }
  } catch (error) {
    console.error('[getInfluencers] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let categories = [];
    let total = 0;

    if (isPostgres) {
      console.log('[getCategories] Querying PostgreSQL...');
      // Use _raw model directly instead of wrapper to bypass the problematic findAndCountAll
      const Category = models._raw?.Category || models.Category;
      if (!Category || !Category.findAll) {
        throw new Error('Category model not available');
      }
      
      // Fetch categories directly without include
      categories = await Category.findAll({
        limit: +limit,
        offset: +offset,
        order: [['name', 'ASC']],
        raw: true
      });

      // Count separately
      total = await Category.count();
      console.log('[getCategories] Found ' + categories.length + ' categories, total: ' + total);
    } else {
      const result = await models.Category.findAndCountAll({
        skip: offset,
        limit: +limit,
        sort: { name: 1 }
      });
      categories = result.rows || [];
      total = result.count;
    }

    // Map to plain objects for response
    const data = categories.map(cat => ({
      id: cat.id || cat._id,
      name: cat.name,
      description: cat.description,
      image: cat.image,
      slug: cat.slug,
      isActive: cat.isActive || cat.is_active
    }));

    console.log('[getCategories] Returning ' + data.length + ' categories');

    return res.json({
      success: true,
      data: data,
      pagination: {
        total: total,
        page: +page,
        limit: +limit,
        pages: Math.ceil(total / limit)
      }
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

exports.getStyleInspiration = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let inspirations;
    let total;

    if (isPostgres) {
      const result = await models.StyleInspiration.findAndCountAll({
        limit: +limit,
        offset: +offset,
        order: [['createdAt', 'DESC']]
      });

      inspirations = result.rows;
      total = result.count;
    } else {
      const result = await models.StyleInspiration.findAndCountAll({
        skip: offset,
        limit: +limit,
        sort: { createdAt: -1 }
      });

      inspirations = result.rows;
      total = result.count;
    }

    res.json({
      success: true,
      inspirations: inspirations,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getStyleInspiration] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createStyleInspiration = async (req, res) => {
  try {
    const inspiration = await models.StyleInspiration.create(req.body);
    res.status(201).json({ success: true, inspiration });
  } catch (error) {
    console.error('[createStyleInspiration] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStyleInspiration = async (req, res) => {
  try {
    const { id } = req.params;
    const inspiration = await models.StyleInspiration.findByPk(id);
    if (!inspiration) {
      return res.status(404).json({ success: false, error: 'Style inspiration not found' });
    }
    await inspiration.update(req.body);
    res.json({ success: true, inspiration });
  } catch (error) {
    console.error('[updateStyleInspiration] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteStyleInspiration = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await models.StyleInspiration.destroy({ where: { id } });
    res.json({ success: result > 0 });
  } catch (error) {
    console.error('[deleteStyleInspiration] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};
