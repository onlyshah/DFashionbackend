const express = require('express');
const router = express.Router();

// In-memory store for style inspirations (replace with DB in production)
let inspirations = [
  // Example:
  // { id: 1, title: 'Office Chic', subtitle: 'Professional yet stylish', image: '', tags: ['Professional', 'Elegant', 'Modern'] }
];
let nextId = 1;

// GET all inspirations
router.get('/', (req, res) => {
  res.json({ success: true, inspirations });
});

// GET single inspiration
router.get('/:id', (req, res) => {
  const inspiration = inspirations.find(i => i.id === parseInt(req.params.id));
  if (!inspiration) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, inspiration });
});

// CREATE inspiration
router.post('/', (req, res) => {
  const newInsp = { id: nextId++, ...req.body };
  inspirations.push(newInsp);
  res.status(201).json({ success: true, inspiration: newInsp });
});

// UPDATE inspiration
router.put('/:id', (req, res) => {
  const idx = inspirations.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  inspirations[idx] = { ...inspirations[idx], ...req.body };
  res.json({ success: true, inspiration: inspirations[idx] });
});

// DELETE inspiration
router.delete('/:id', (req, res) => {
  const idx = inspirations.findIndex(i => i.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: 'Not found' });
  const removed = inspirations.splice(idx, 1);
  res.json({ success: true, inspiration: removed[0] });
});

module.exports = router;
