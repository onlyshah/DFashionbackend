/**
 * ============================================================================
 * EXAMPLE ROUTES - Product Controller Usage
 * ============================================================================
 * 
 * This shows how to use the database-agnostic controllers.
 * The same routes work for BOTH PostgreSQL and MongoDB!
 * 
 * Place this in: backend/routes/productRoutes.js
 * Then require it in your main routerindex.js:
 * 
 *   const productRoutes = require('./productRoutes');
 *   app.use('/api/products', productRoutes);
 */

const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');

// Middleware examples (authentication, validation, etc.)
// const authMiddleware = require('../middleware/auth');
// const validateRequest = require('../middleware/validateRequest');

/**
 * GET /api/products
 * Get all products with pagination and filtering
 * 
 * Query Parameters:
 *   - page: number (default: 1)
 *   - limit: number (default: 10, max: 100)
 *   - search: string (searches in name and description)
 *   - categoryId: string (UUID for postgres, ObjectId for mongo)
 *   - brandId: string (UUID for postgres, ObjectId for mongo)
 *   - sortBy: 'name' | 'price' | 'createdAt' | 'updatedAt' (default: createdAt)
 *   - sortOrder: 'ASC' | 'DESC' for postgres, 1 | -1 for mongo (default: DESC)
 * 
 * Example:
 *   GET /api/products?page=1&limit=20&search=shirt&sortBy=price&sortOrder=ASC
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Products retrieved successfully",
 *     "data": {
 *       "products": [...],
 *       "pagination": {
 *         "total": 100,
 *         "page": 1,
 *         "limit": 20,
 *         "pages": 5
 *       }
 *     }
 *   }
 */
router.get('/', productController.getAll);

/**
 * GET /api/products/:id
 * Get single product by ID with full details and associations
 * 
 * URL Parameter:
 *   - id: string (UUID for postgres, ObjectId for mongo)
 * 
 * Example:
 *   GET /api/products/550e8400-e29b-41d4-a716-446655440000
 *   GET /api/products/507f1f77bcf86cd799439011
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Product retrieved successfully",
 *     "data": {
 *       "id": "...",
 *       "name": "Product Name",
 *       "description": "...",
 *       "price": 99.99,
 *       "category": { "id": "...", "name": "..." },
 *       "brand": { "id": "...", "name": "..." }
 *     }
 *   }
 * 
 * Error Response (404):
 *   {
 *     "success": false,
 *     "message": "Product with ID '...' not found",
 *     "errorCode": "PRODUCT_NOT_FOUND"
 *   }
 * 
 * Error Response (400):
 *   {
 *     "success": false,
 *     "message": "Product ID is required and must be a valid string",
 *     "errorCode": "INVALID_ID"
 *   }
 */
router.get('/:id', productController.getById);

/**
 * POST /api/products
 * Create new product
 * 
 * Required Body Fields:
 *   - name: string (non-empty)
 *   - description: string (non-empty)
 *   - price: number (≥ 0)
 *   - categoryId: string (UUID for postgres, ObjectId for mongo)
 * 
 * Optional Body Fields:
 *   - brandId: string (UUID for postgres, ObjectId for mongo)
 *   - stock: number (default: 0)
 *   - sku: string
 *   - image: string (URL)
 * 
 * Example Request:
 *   POST /api/products
 *   Content-Type: application/json
 *   
 *   {
 *     "name": "Stylish Blue Shirt",
 *     "description": "Premium cotton shirt in vibrant blue",
 *     "price": 49.99,
 *     "categoryId": "550e8400-e29b-41d4-a716-446655440000",
 *     "brandId": "550e8400-e29b-41d4-a716-446655440001",
 *     "stock": 100,
 *     "sku": "BLUE-SHIRT-001",
 *     "image": "https://example.com/images/blue-shirt.jpg"
 *   }
 * 
 * Response (201):
 *   {
 *     "success": true,
 *     "message": "Product created successfully",
 *     "data": { "id": "...", "name": "...", ... }
 *   }
 * 
 * Error Response (400):
 *   {
 *     "success": false,
 *     "message": "Product name is required and must be a non-empty string",
 *     "errorCode": "INVALID_NAME"
 *   }
 * 
 * Error Response (409):
 *   {
 *     "success": false,
 *     "message": "Product with this SKU or name already exists",
 *     "errorCode": "DUPLICATE_ENTRY"
 *   }
 */
router.post('/', productController.create);

/**
 * PUT /api/products/:id
 * Update existing product
 * 
 * URL Parameter:
 *   - id: string (UUID for postgres, ObjectId for mongo)
 * 
 * Optional Body Fields (any of these):
 *   - name: string (non-empty)
 *   - description: string (non-empty)
 *   - price: number (≥ 0)
 *   - categoryId: string
 *   - brandId: string
 *   - stock: number
 *   - sku: string
 *   - image: string (URL)
 * 
 * Example Request:
 *   PUT /api/products/550e8400-e29b-41d4-a716-446655440000
 *   Content-Type: application/json
 *   
 *   {
 *     "price": 39.99,
 *     "stock": 75
 *   }
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Product updated successfully",
 *     "data": { "id": "...", "price": 39.99, "stock": 75, ... }
 *   }
 * 
 * Error Response (404):
 *   {
 *     "success": false,
 *     "message": "Product with ID '...' not found",
 *     "errorCode": "PRODUCT_NOT_FOUND"
 *   }
 * 
 * Error Response (400):
 *   {
 *     "success": false,
 *     "message": "Product price must be a positive number",
 *     "errorCode": "INVALID_PRICE"
 *   }
 */
router.put('/:id', productController.update);

/**
 * DELETE /api/products/:id
 * Delete product by ID
 * 
 * URL Parameter:
 *   - id: string (UUID for postgres, ObjectId for mongo)
 * 
 * Example Request:
 *   DELETE /api/products/550e8400-e29b-41d4-a716-446655440000
 * 
 * Response:
 *   {
 *     "success": true,
 *     "message": "Product deleted successfully",
 *     "data": {
 *       "id": "...",
 *       "deletedAt": "2026-05-05T12:34:56.789Z"
 *     }
 *   }
 * 
 * Error Response (404):
 *   {
 *     "success": false,
 *     "message": "Product with ID '...' not found",
 *     "errorCode": "PRODUCT_NOT_FOUND"
 *   }
 * 
 * Error Response (400):
 *   {
 *     "success": false,
 *     "message": "Product ID is required and must be a valid string",
 *     "errorCode": "INVALID_ID"
 *   }
 */
router.delete('/:id', productController.delete);

module.exports = router;
