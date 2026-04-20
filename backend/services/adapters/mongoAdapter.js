/**
 * ============================================================================
 * MONGODB ADAPTER (DISABLED)
 * ============================================================================
 * MongoDB support is currently DISABLED to ensure PostgreSQL is used exclusively
 * This adapter is kept for future re-enablement
 * 
 * To re-enable MongoDB:
 * 1. Uncomment the require statement below
 * 2. Set DB_TYPE=mongodb in .env
 * 3. Implement all required methods
 * 
 * Current Status: ⛔ DISABLED
 */

const createDisabledAdapter = () => {
  throw new Error(
    'MongoDB adapter is currently DISABLED. ' +
    'To re-enable: Set DB_TYPE=mongodb and implement MongoDB adapter. ' +
    'Currently using PostgreSQL for all operations.'
  );
};

module.exports = createDisabledAdapter();
