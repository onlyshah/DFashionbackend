const models = require('../models');

exports.getTrending = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let products;
    let total;

    if (models.isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true, isFeatured: true },
        limit: +limit,
        offset: +offset,
        order: [['createdAt', 'DESC']]
      });

      products = result.rows;
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        isFeatured: true,
        skip: offset,
        limit: +limit,
        sort: { createdAt: -1 }
      });

      products = result.rows;
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

    if (models.isPostgres) {
      // PostgreSQL: Get all brands
      const result = await models.Brand.findAndCountAll({
        limit: +limit,
        offset: +offset,
        attributes: ['id', 'name', 'description'],
        order: [['name', 'ASC']]
      });

      brands = result.rows;
      total = result.count;
    } else {
      // MongoDB: Get all brands
      const result = await models.Brand.findAndCountAll({
        skip: offset,
        limit: +limit,
        sort: { name: 1 }
      });

      brands = result.rows;
      total = result.count;
    }

    // Transform to match frontend expectations
    const transformedBrands = brands.map(brand => ({
      id: brand.id || brand._id,
      name: brand.name,
      logo: `/uploads/brands/${brand.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      isPopular: true
    }));

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

    if (models.isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['createdAt', 'DESC']]
      });

      products = result.rows;
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { createdAt: -1 }
      });

      products = result.rows;
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

    if (models.isPostgres) {
      const result = await models.Product.findAndCountAll({
        where: { isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['ratings', 'DESC'], ['createdAt', 'DESC']]
      });

      products = result.rows;
      total = result.count;
    } else {
      const result = await models.Product.findAndCountAll({
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { ratings: -1, createdAt: -1 }
      });

      products = result.rows;
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

    let users;
    let total;

    if (models.isPostgres) {
      const result = await models.User.findAndCountAll({
        where: { isInfluencer: true, isActive: true },
        limit: +limit,
        offset: +offset,
        order: [['createdAt', 'DESC']]
      });

      users = result.rows;
      total = result.count;
    } else {
      const result = await models.User.findAndCountAll({
        isInfluencer: true,
        isActive: true,
        skip: offset,
        limit: +limit,
        sort: { createdAt: -1 }
      });

      users = result.rows;
      total = result.count;
    }

    res.json({
      success: true,
      data: users,
      pagination: { page: +page, limit: +limit, total: total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('[getInfluencers] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};


exports.getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let categories;
    let total;

    if (models.isPostgres) {
      const result = await models.Category.findAndCountAll({
        limit: +limit,
        offset: +offset,
        order: [['name', 'ASC']],
        include: [{
          model: models.SubCategory._model,
          as: 'SubCategories',
          attributes: ['id', 'name'],
          required: false
        }]
      });

      categories = result.rows;
      total = result.count;
    } else {
      const result = await models.Category.findAndCountAll({
        skip: offset,
        limit: +limit,
        sort: { name: 1 },
        populate: [{
          path: 'subcategories',
          select: 'id name',
          options: { required: false }
        }]
      });

      categories = result.rows;
      total = result.count;
    }

    return res.json({
      success: true,
      data: categories.map(cat => ({
        id: cat.id || cat._id,
        name: cat.name,
        description: cat.description,
        subCategories: cat.SubCategories || cat.subcategories || []
      })),
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

    if (models.isPostgres) {
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
