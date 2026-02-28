/**
 * API IMPLEMENTATION GUIDE - Foreign Key Resolution
 * Template patterns for updating ALL GET/POST/PUT endpoints
 * 
 * RULE: Every endpoint that returns data with FK must:
 * 1. Use buildIncludeClause() for eager loading
 * 2. Use sanitizeRecords() for response formatting
 * 3. Use validateFK() before CREATE/UPDATE
 */

// ============================================================================
// TEMPLATE 1: GET LIST WITH PAGINATION (e.g., getAllProducts)
// ============================================================================

const { formatPaginatedResponse, buildIncludeClause, validateFK } = require('../utils/fkResponseFormatter');

exports.getAllProducts = async (req, res) => {
  try {
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Product.findAndCountAll({
      include: buildIncludeClause('Product'),  // ← Auto-includes Brand, Category, Seller
      limit,
      offset,
      distinct: true
    });

    // Format with pagination helper
    const response = formatPaginatedResponse(
      rows,
      { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    );

    return ApiResponse.success(res, response.data, 'Products retrieved', response.pagination);
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// TEMPLATE 2: GET SINGLE RECORD (e.g., getProductById)
// ============================================================================

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await models.Product.findByPk(id, {
      include: buildIncludeClause('Product')  // ← Auto-includes relationships
    });

    if (!product) return ApiResponse.notFound(res, 'Product');

    // Format single record - removes raw FK IDs
    const response = formatSingleResponse(product);

    return ApiResponse.success(res, response, 'Product retrieved');
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// TEMPLATE 3: CREATE WITH FK VALIDATION (e.g., createCart)
// ============================================================================

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userId = req.user.id;

    // VALIDATE foreign keys exist before creating
    const validation = await validateMultipleFK([
      { model: 'User', id: userId },
      { model: 'Product', id: productId }
    ]);

    if (!validation.isValid) {
      return ApiResponse.error(res, validation.errors.join('; '), 400);
    }

    // Now safe to create
    const cartItem = await models.Cart.create({
      userId,
      productId,
      quantity
    });

    // Return with relationships
    const item = await models.Cart.findByPk(cartItem.id, {
      include: buildIncludeClause('Cart')
    });

    return ApiResponse.created(res, formatSingleResponse(item), 'Item added to cart');
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// TEMPLATE 4: UPDATE WITH FK VALIDATION
// ============================================================================

exports.updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, shippingAddressId } = req.body;

    const order = await models.Order.findByPk(id);
    if (!order) return ApiResponse.notFound(res, 'Order');

    // VALIDATE if updating shipping address FK
    if (shippingAddressId) {
      const isValid = await validateFK('Address', shippingAddressId);
      if (!isValid) {
        return ApiResponse.error(res, 'Address not found', 400);
      }
    }

    // Update
    await order.update({ status, shippingAddressId });

    // Return with all relationships
    const updated = await models.Order.findByPk(id, {
      include: buildIncludeClause('Order')
    });

    return ApiResponse.success(res, formatSingleResponse(updated), 'Order updated');
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// TEMPLATE 5: COMPLEX FK - ORDER WITH NESTED ITEMS & PAYMENTS
// ============================================================================

exports.getOrderWithDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await models.Order.findByPk(id, {
      include: [
        {
          model: models.User,
          as: 'customer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: models.OrderItem,
          as: 'items',
          include: {
            model: models.Product,
            attributes: ['id', 'name', 'price', 'images', 'sku']
          }
        },
        {
          model: models.Payment,
          as: 'payments',
          required: false
        },
        {
          model: models.Shipment,
          as: 'shipments',
          include: {
            model: models.Courier,
            attributes: ['id', 'name', 'trackingUrl']
          },
          required: false
        }
      ]
    });

    if (!order) return ApiResponse.notFound(res, 'Order');

    // Format response
    const response = formatSingleResponse(order);

    // ADDITIONALLY parse JSON shipping address
    if (response.shippingAddress && typeof response.shippingAddress === 'string') {
      try {
        response.shippingAddress = JSON.parse(response.shippingAddress);
      } catch (e) {
        // Keep as is
      }
    }

    return ApiResponse.success(res, response, 'Order details retrieved');
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// TEMPLATE 6: RESPONSE STRUCTURE FOR ADMIN PANEL
// ============================================================================

exports.getAdminOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const where = status ? { status } : {};

    const { count, rows } = await models.Order.findAndCountAll({
      where,
      include: [
        {
          model: models.User,
          as: 'customer',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: models.Payment,
          as: 'payments',
          required: false
        },
        {
          model: models.Shipment,
          as: 'shipments',
          required: false
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    // Format for admin UI - no raw FK IDs
    const response = formatPaginatedResponse(
      rows,
      { page, limit, total: count, totalPages: Math.ceil(count / limit) }
    );

    return ApiResponse.success(res, {
      orders: response.data,
      pagination: response.pagination
    }, 'Admin orders retrieved');
  } catch (error) {
    console.error('Error:', error);
    return ApiResponse.serverError(res, error);
  }
};

// ============================================================================
// IMPLEMENTATION CHECKLIST FOR EACH API
// ============================================================================

/*
✅ BEFORE DEPLOYING ANY GET ENDPOINT:

1. [ ] Does it have include: buildIncludeClause('ModelName') ?
2. [ ] Does it use formatSingleResponse() or formatPaginatedResponse() ?
3. [ ] Are raw FK IDs removed from response?
4. [ ] Are nested objects included?
5. [ ] Are JSON fields parsed (shippingAddress, metadata)?
6. [ ] Test response - no raw user_id, productId, etc visible?

✅ BEFORE DEPLOYING ANY CREATE/UPDATE ENDPOINT:

1. [ ] Does it validate FKs with validateFK() or validateMultipleFK() ?
2. [ ] Does it return with include: buildIncludeClause() ?
3. [ ] Does it use formatSingleResponse() in response?
4. [ ] Does it handle invalid FK gracefully?
5. [ ] Test - can't create with non-existent FK?

✅ MODELS TO PRIORITIZE:

Priority 1 (Critical):
- Order (complex, multiple FKs, high traffic)
- Product (brand, category, seller FKs)
- Cart (user, product FKs)
- Payment (order FK)
- Shipment (order, courier FKs)

Priority 2 (Important):
- User (role FK)
- Post, Story, Reel (user FK)
- ProductComment (user, product FKs)
- Wishlist (user, product FKs)

Priority 3 (Lower traffic):
- Transaction, Ticket, Notification (user FK)
- Category, Brand (parent-child relations)
- Return (order, user FKs)

✅ MONGODB PARALLEL UPDATES (if needed):

Same pattern but use .populate() instead of include:
const order = await Order.findById(id).populate('customerId', 'firstName email');
*/

module.exports = {
  // Export as examples
  templateNote: 'See above for implementation patterns'
};
