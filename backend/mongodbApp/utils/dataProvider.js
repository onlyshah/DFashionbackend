const { Op } = require('sequelize');

let dbAvailable = false;

const progressStore = {
  users: 0,
  vendors: 0,
  products: 0,
  orders: 0,
  revenue: 0
};

function enableDb() { dbAvailable = true; }
function disableDb() { dbAvailable = false; }
function isDbAvailable() { return dbAvailable; }

function updateProgress(key, value = 1) {
  if (progressStore[key] === undefined) return;
  progressStore[key] += value;
}

// Helpers
function sanitizeWhereForSequelize(rawModel, where = {}) {
  if (!rawModel) return {};
  const allowed = rawModel.rawAttributes ? Object.keys(rawModel.rawAttributes) : [];
  const safeWhere = {};
  for (const k of Object.keys(where || {})) {
    if (allowed.includes(k)) safeWhere[k] = where[k];
  }
  return safeWhere;
}

function convertSequelizeOpsToMongo(where) {
  if (!where || typeof where !== 'object') return where;
  const res = Array.isArray(where) ? [] : {};
  for (const key of Object.keys(where)) {
    const val = where[key];
    if (val && typeof val === 'object') res[key] = convertSequelizeOpsToMongo(val);
    else res[key] = val;
  }
  const syms = Object.getOwnPropertySymbols(where || {});
  for (const s of syms) {
    const sStr = s.toString();
    let mongoOp = null;
    if (sStr.includes('gte')) mongoOp = '$gte';
    else if (sStr.includes('lte')) mongoOp = '$lte';
    else if (sStr.includes('gt')) mongoOp = '$gt';
    else if (sStr.includes('lt')) mongoOp = '$lt';
    else if (sStr.includes('ne')) mongoOp = '$ne';
    else if (sStr.includes('in')) mongoOp = '$in';
    else if (sStr.includes('or')) mongoOp = '$or';
    if (mongoOp) res[mongoOp] = convertSequelizeOpsToMongo(where[s]);
  }
  return res;
}

function sanitizeMongooseWhere(where) {
  if (!where || typeof where !== 'object') return where;
  const out = Array.isArray(where) ? [] : {};
  for (const k of Object.keys(where)) {
    const v = where[k];
    if (v && typeof v === 'object') {
      const cleaned = sanitizeMongooseWhere(v);
      if (cleaned && (Array.isArray(cleaned) ? cleaned.length > 0 : Object.keys(cleaned).length > 0)) out[k] = cleaned;
    } else if (v !== undefined && v !== null && v !== '') {
      out[k] = v;
    }
  }
  // validate date ops
  const dateOps = ['$gte', '$lte', '$gt', '$lt'];
  for (const k of Object.keys(out)) {
    const val = out[k];
    if (val && typeof val === 'object') {
      const hasDateOp = dateOps.some(op => op in val);
      if (hasDateOp) {
        const cleaned = {};
        for (const op of dateOps) {
          if (!(op in val)) continue;
          const cand = val[op];
          const d = cand instanceof Date ? cand : (typeof cand === 'string' || typeof cand === 'number' ? new Date(cand) : null);
          if (d && !isNaN(d.getTime())) cleaned[op] = d;
        }
        if (Object.keys(cleaned).length > 0) out[k] = cleaned; else delete out[k];
      }
    }
  }
  return out;
}

async function count(modelName, modelsRef = {}, where = {}) {
  const { wrapped, raw } = modelsRef;
  if (dbAvailable && (raw || wrapped)) {
    // Prefer raw Sequelize when available
    try {
      if (raw && typeof raw.count === 'function') {
        const safeWhere = sanitizeWhereForSequelize(raw, where);
        return await raw.count({ where: safeWhere });
      }
      // If wrapped has countDocuments (Mongoose)
      if (wrapped && typeof wrapped.countDocuments === 'function') {
        const mongoWhere = sanitizeMongooseWhere(convertSequelizeOpsToMongo(where));
        if (!mongoWhere || Object.keys(mongoWhere).length === 0) return await wrapped.countDocuments();
        return await wrapped.countDocuments(mongoWhere);
      }
      if (wrapped && typeof wrapped.count === 'function') {
        return await wrapped.count({ where });
      }
    } catch (e) {
      // If DB error, fall through to progress fallback
      console.error('dataProvider.count db error:', e.message || e);
    }
  }

  // fallback to progress store
  return progressStore[modelName] || 0;
}

async function sum(modelName, modelsRef = {}, field, where = {}) {
  const { wrapped, raw } = modelsRef;
  if (dbAvailable && (raw || wrapped)) {
    try {
      if (raw && typeof raw.sum === 'function') {
        const safeWhere = sanitizeWhereForSequelize(raw, where);
        return await raw.sum(field, { where: safeWhere }) || 0;
      }
      if (wrapped && typeof wrapped.sum === 'function') {
        // wrapped.sum might accept (field, options)
        return await wrapped.sum(field, { where }) || 0;
      }
    } catch (e) {
      console.error('dataProvider.sum db error:', e.message || e);
    }
  }
  // fallback
  if (field === 'total') return progressStore.revenue || 0;
  return 0;
}

module.exports = {
  enableDb,
  disableDb,
  isDbAvailable,
  updateProgress,
  count,
  sum,
  progressStore
};
