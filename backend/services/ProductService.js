/**
 * ============================================================================
 * PRODUCT SERVICE - Business Logic Layer
 * ============================================================================
 * Purpose: Handle all product-related business logic
 */

class ProductService {
  constructor(models) {
    this.Product = models.Product;
    this.Category = models.Category;
    this.Inventory = models.Inventory;
    this.InventoryHistory = models.InventoryHistory;
    this.ProductVariant = models.ProductVariant;
  }

  /**
   * Create product
   */
  async createProduct(sellerId, productData) {
    try {
      const {
        name,
        description,
        categoryId,
        basePrice,
        sellingPrice,
        costPrice,
        quantityAvailable,
        sku,
        attributes = {}
      } = productData;

      if (!name || !categoryId || !basePrice || !sellingPrice) {
        throw {
          code: 'MISSING_FIELDS',
          message: 'Missing required product fields'
        };
      }

      // Check if SKU is unique
      if (sku) {
        const existing = await this.Product.findOne({ where: { sku } });
        if (existing) {
          throw {
            code: 'SKU_EXISTS',
            message: 'Product with this SKU already exists'
          };
        }
      }

      // Create product
      const product = await this.Product.create({
        seller_id: sellerId,
        name,
        description,
        category_id: categoryId,
        base_price: basePrice,
        selling_price: sellingPrice,
        cost_price: costPrice,
        quantity_available: quantityAvailable || 0,
        sku,
        attributes,
        status: 'pending', // Requires admin approval
        discount_percentage: ((basePrice - sellingPrice) / basePrice * 100).toFixed(2)
      });

      // Initialize inventory
      if (this.Inventory) {
        await this.Inventory.create({
          product_id: product.id,
          quantity_on_hand: quantityAvailable || 0,
          quantity_available: quantityAvailable || 0
        });
      }

      return {
        id: product.id,
        name: product.name,
        status: product.status,
        createdAt: product.created_at
      };
    } catch (error) {
      console.error('ProductService.createProduct error:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    try {
      const product = await this.Product.findByPk(productId);

      if (!product) {
        throw {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        };
      }

      // Get inventory
      let inventory = null;
      if (this.Inventory) {
        inventory = await this.Inventory.findOne({
          where: { product_id: productId }
        });
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.category_id,
        basePrice: product.base_price,
        sellingPrice: product.selling_price,
        discountPercentage: product.discount_percentage,
        quantityAvailable: inventory?.quantity_available || product.quantity_available,
        status: product.status,
        averageRating: product.average_rating,
        reviewCount: product.review_count,
        isFeatured: product.is_featured
      };
    } catch (error) {
      console.error('ProductService.getProduct error:', error);
      throw error;
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, sellerId, updateData) {
    try {
      const product = await this.Product.findByPk(productId);

      if (!product) {
        throw {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        };
      }

      // Check ownership
      if (product.seller_id !== sellerId) {
        throw {
          code: 'NOT_OWNER',
          message: 'You can only update your own products'
        };
      }

      // Update fields
      if (updateData.name) product.name = updateData.name;
      if (updateData.description) product.description = updateData.description;
      if (updateData.basePrice) product.base_price = updateData.basePrice;
      if (updateData.sellingPrice) product.selling_price = updateData.sellingPrice;

      // Recalculate discount
      if (updateData.basePrice || updateData.sellingPrice) {
        const base = updateData.basePrice || product.base_price;
        const selling = updateData.sellingPrice || product.selling_price;
        product.discount_percentage = ((base - selling) / base * 100).toFixed(2);
      }

      product.updated_at = new Date();
      await product.save();

      return { success: true, message: 'Product updated successfully' };
    } catch (error) {
      console.error('ProductService.updateProduct error:', error);
      throw error;
    }
  }

  /**
   * List products with filters and pagination
   */
  async listProducts(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const { categoryId, sellerId, status = 'active', search, minPrice, maxPrice } = filters;

      let where = {};

      // Only show active products to customers
      if (status) {
        where.status = status;
      }

      if (categoryId) {
        where.category_id = categoryId;
      }

      if (sellerId) {
        where.seller_id = sellerId;
      }

      if (search) {
        where.name = { $like: `%${search}%` };
      }

      if (minPrice || maxPrice) {
        where.selling_price = {};
        if (minPrice) where.selling_price.$gte = minPrice;
        if (maxPrice) where.selling_price.$lte = maxPrice;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await this.Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        data: rows.map(product => ({
          id: product.id,
          name: product.name,
          categoryId: product.category_id,
          sellingPrice: product.selling_price,
          quantityAvailable: product.quantity_available,
          averageRating: product.average_rating,
          status: product.status
        })),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('ProductService.listProducts error:', error);
      throw error;
    }
  }

  /**
   * Check inventory and reserve quantity
   */
  async reserveInventory(productId, quantity) {
    try {
      const product = await this.Product.findByPk(productId);

      if (!product) {
        throw {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        };
      }

      if (product.quantity_available < quantity) {
        throw {
          code: 'INSUFFICIENT_INVENTORY',
          message: `Only ${product.quantity_available} items available`,
          available: product.quantity_available,
          requested: quantity
        };
      }

      // Update inventory
      product.quantity_available -= quantity;
      product.quantity_sold += quantity;

      await product.save();

      // Log transaction
      if (this.InventoryHistory) {
        await this.InventoryHistory.create({
          product_id: productId,
          transaction_type: 'reservation',
          quantity_change: -quantity,
          notes: `Reserved ${quantity} units`
        });
      }

      return { success: true, message: 'Inventory reserved' };
    } catch (error) {
      console.error('ProductService.reserveInventory error:', error);
      throw error;
    }
  }

  /**
   * Release inventory (e.g., on order cancellation)
   */
  async releaseInventory(productId, quantity) {
    try {
      const product = await this.Product.findByPk(productId);

      if (!product) {
        throw {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        };
      }

      // Update inventory
      product.quantity_available += quantity;
      product.quantity_sold = Math.max(0, product.quantity_sold - quantity);

      await product.save();

      // Log transaction
      if (this.InventoryHistory) {
        await this.InventoryHistory.create({
          product_id: productId,
          transaction_type: 'release',
          quantity_change: quantity,
          notes: `Released ${quantity} units`
        });
      }

      return { success: true, message: 'Inventory released' };
    } catch (error) {
      console.error('ProductService.releaseInventory error:', error);
      throw error;
    }
  }

  /**
   * Get inventory history
   */
  async getInventoryHistory(productId, limit = 50) {
    try {
      if (!this.InventoryHistory) {
        return [];
      }

      const history = await this.InventoryHistory.findAll({
        where: { product_id: productId },
        order: [['created_at', 'DESC']],
        limit
      });

      return history.map(h => ({
        type: h.transaction_type,
        quantity: h.quantity_change,
        notes: h.notes,
        date: h.created_at
      }));
    } catch (error) {
      console.error('ProductService.getInventoryHistory error:', error);
      return [];
    }
  }

  /**
   * Get product sales statistics
   */
  async getProductStats(productId) {
    try {
      const product = await this.Product.findByPk(productId);

      if (!product) {
        throw {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        };
      }

      return {
        productId: product.id,
        name: product.name,
        quantitySold: product.quantity_sold,
        quantityAvailable: product.quantity_available,
        averageRating: product.average_rating,
        reviewCount: product.review_count,
        revenue: (product.selling_price * product.quantity_sold).toFixed(2)
      };
    } catch (error) {
      console.error('ProductService.getProductStats error:', error);
      throw error;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query, limit = 20) {
    try {
      const products = await this.Product.findAll({
        where: {
          status: 'active',
          $or: [
            { name: { $like: `%${query}%` } },
            { description: { $like: `%${query}%` } }
          ]
        },
        limit,
        order: [['average_rating', 'DESC']]
      });

      return products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.selling_price,
        rating: p.average_rating
      }));
    } catch (error) {
      console.error('ProductService.searchProducts error:', error);
      throw error;
    }
  }
}

module.exports = ProductService;
