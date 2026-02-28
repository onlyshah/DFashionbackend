⚠️ DEPRECATED - MongoDB Schemas (Archive)

## Status: ARCHIVED - NOT ACTIVELY USED

This directory contains MongoDB schema definitions that are **NO LONGER USED** by the application.

### Why Archived?
- System database has been standardized to **PostgreSQL only** via Sequelize ORM
- `DB_TYPE` environment variable is configured for PostgreSQL
- All active models are in `/models_sql/` directory
- MongoDB conditional loading code remains for backward compatibility but these schemas are never instantiated

### Migration Timeline
- **Original**: Dual database support (PostgreSQL + MongoDB)
- **Current**: PostgreSQL-only production environment
- **Schema**: All business logic ported to Sequelize models in `/models_sql/`

### Files in This Directory
Contains 49 Mongoose schema definitions for:
- User, Role, Permission, Department, Module
- Product, Brand, Category, SubCategory
- Cart, Wishlist, Order, Payment
- Shipment, Return, Courier, Transaction
- Post, Story, Reel, LiveStream
- And 24+ more models

### ⚠️ Do Not Use
These schemas are **NOT compatible** with the production PostgreSQL database:
- ❌ Different field names (snake_case vs camelCase inconsistencies)
- ❌ Missing FK constraints present in SQL models
- ❌ Mongoose-specific syntax not compatible with Sequelize
- ❌ No active imports or instantiation in application

### Recommended Actions
1. **Keep** - For reference/documentation purposes only
2. **Archive** - Move to `/archived/models_old/` if migrating
3. **Delete** - If confirmed no legacy integration needed
4. **Document** - Mark in version control as deprecated

### References
- Active models: `./models_sql/` ← USE THIS
- Database config: `./config/postgres.js` and `./config/dbFactory.js`
- Service loader: `./utils/serviceLoader.js` checks `DB_TYPE` only

---
**Last Updated**: February 26, 2026
**System DB**: PostgreSQL (Sequelize)
**Status**: ✋ ARCHIVED
