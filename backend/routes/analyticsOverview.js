const express = require('express');
const router = express.Router();

// In-memory store for analytics overview (replace with DB in production)
let analyticsOverview = {
  users: 0,
  products: 0,
  orders: 0,
  revenue: 0
};

// GET overview
router.get('/', (req, res) => {
  res.json({ success: true, data: analyticsOverview });
});

// CREATE overview (replace with DB logic as needed)
router.post('/', (req, res) => {
  analyticsOverview = { ...analyticsOverview, ...req.body };
  res.status(201).json({ success: true, data: analyticsOverview });
});

// UPDATE overview
router.put('/', (req, res) => {
  analyticsOverview = { ...analyticsOverview, ...req.body };
  res.json({ success: true, data: analyticsOverview });
});

// DELETE overview (reset to zero)
router.delete('/', (req, res) => {
  analyticsOverview = { users: 0, products: 0, orders: 0, revenue: 0 };
  res.json({ success: true, data: analyticsOverview });
});

module.exports = router;
