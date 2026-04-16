# 🏷️ Brand Logo Setup Guide

## Overview

Brand logos are stored in `backend/uploads/brands/` and served via the `/uploads/brands/` URL endpoint.

**Current Status:**
- ✅ Seeders updated to use individual brand logos
- ✅ Folder structure ready: `backend/uploads/brands/`
- ⏳ TODO: Create actual brand logo images

---

## 📁 Directory Structure

```
backend/uploads/brands/
├── default-brand.png      (fallback)
├── default.jpg            (backup fallback)
├── nike.png              (TO CREATE)
├── adidas.png
├── puma.png
├── ralph-lauren.png
├── levis.png
├── tommy-hilfiger.png
├── calvin-klein.png
├── gucci.png
├── hm.png
├── zara.png
├── forever21.png
├── louis-vuitton.png
├── versace.png
├── chanel.png
├── dior.png
└── prada.png
```

---

## 🎯 3 Ways to Create Brand Logos

### **Option 1: Auto-Generate with Canvas (Recommended for Development)**

#### Prerequisites:
```bash
npm install canvas
```

#### Generate all logos:
```bash
cd backend
node scripts/generate-brand-logos.js
```

**Output:**
- Creates 200x200px PNG files
- Uses brand-specific colors
- Includes brand name/initials
- Skips existing files

---

### **Option 2: Use Online Service (Quickest)**

Use placeholder/logo services to fetch:

```bash
# Example: Using placeholder.com
cd backend/uploads/brands

# Nike
curl -o nike.png "https://via.placeholder.com/200/111111/FFFFFF?text=Nike"

# Adidas
curl -o adidas.png "https://via.placeholder.com/200/000000/FFFFFF?text=Adidas"

# ... repeat for other brands
```

Or create a batch script:

```bash
# download-logos.sh
#!/bin/bash

BRANDS=("nike" "adidas" "puma" "gucci" "calvin-klein" "tommy-hilfiger")
SIZE="200x200"

for brand in "${BRANDS[@]}"; do
  curl -o "$brand.png" "https://via.placeholder.com/$SIZE/1a1a1a/ffffff?text=${brand^}"
  echo "✅ Downloaded $brand.png"
done
```

---

### **Option 3: Manual Upload (Professional)**

1. **Find/Download Official Logos:**
   - Search "Nike logo PNG" on Google Images
   - Use official brand websites
   - Download as PNG with transparent background
   - Recommended size: 200x300px

2. **Place in folder:**
   ```
   backend/uploads/brands/
   └── nike.png
   ```

3. **Verify via browser:**
   ```
   http://localhost:3000/uploads/brands/nike.png
   ```

---

## ✅ Verification

### Check if logos are accessible:

```
GET http://localhost:3000/uploads/brands/nike.png
GET http://localhost:3000/uploads/brands/adidas.png
GET http://localhost:3000/uploads/brands/gucci.png
```

### Check in frontend:

1. Go to **Home Page** → **Featured Brands** section
2. Should see individual brand logos instead of generic placeholders
3. Hover over brands to verify logo loads

---

## 🔧 How It Works

### 1. **Database Structure**

The brand seeder stores logo paths:
```javascript
{
  name: 'Nike',
  slug: 'nike',
  logo: '/uploads/brands/nike.png'  // ← This path
}
```

### 2. **Express Static Serving**

In `backend/index.js`:
```javascript
app.use('/uploads', express.static('uploads'));
```

This makes files accessible via: `http://localhost:3000/uploads/brands/nike.png`

### 3. **Frontend Display**

In `featured-brands.component.html`:
```html
<img 
  [src]="brand.logo ? apiUrl + brand.logo : apiUrl + '/uploads/default/brand-placeholder.png'" 
  [alt]="brand.name" 
/>
```

If specific logo exists → Use it  
If not → Fall back to /uploads/default/brand-placeholder.png

---

## 🚀 Next Steps

### 1. Choose generation method (Options 1-3 above)

### 2. Generate or create logos:
```bash
# Auto-generate (if canvas is installed)
node scripts/generate-brand-logos.js

# OR manually add PNG files to backend/uploads/brands/
```

### 3. Re-seed database:
```bash
npm run seed  # or specific: node scripts/seed-brands.js
```

### 4. Visit home page to verify:
```
http://localhost:3000/home
```

---

## 🆘 Troubleshooting

### Logos show as broken images:

**Check 1:** File exists
```bash
ls -la backend/uploads/brands/
```

**Check 2:** Server serves it
```bash
curl http://localhost:3000/uploads/brands/nike.png
```

**Check 3:** Database has correct path
```javascript
// In MongoDB/PostgreSQL
db.brands.findOne({name: 'Nike'})
// Should show: logo: '/uploads/brands/nike.png'
```

**Check 4:** Clear browser cache
```
Ctrl+Shift+R  (hard refresh)
or Ctrl+Shift+Delete (clear cache)
```

### Still using default-brand.png?

**Solution:** Re-run seeder to update database records:
```bash
cd backend
npm run seed
```

---

## 📊 Comparison of Methods

| Method | Time | Effort | Quality | Pros | Cons |
|--------|------|--------|---------|------|------|
| **Canvas Auto-Gen** | 1min | Low | Medium | Fast, consistent, automatic | Basic placeholders |
| **Online Service** | 2min | Low | Medium | Quick, simple | Requires internet |
| **Manual Download** | 15min | High | High | Professional look | Manual process |

---

## 💡 Tips

- **Transparent backgrounds**: Better for dark & light theme compatibility
- **Square dimensions**: 200x200px or 300x300px recommended
- **File size**: Keep under 50KB per logo
- **Format**: PNG recommended (supports transparency)

---

## 🔍 File Reference

- **Seeders:** Backend seeding data
  - `dbseeder/scripts/mongo/brand.seeder.js`
  - `dbseeder/scripts/postgres/05-brand.seeder.js`
  
- **API Endpoint:** Brands API
  - `controllers/brandsController.js`
  - `routes/brands.js`

- **Frontend Components:** Display logos
  - `src/app/enduser-app/features/home/components/featured-brands/`
  - `src/app/enduser-app/features/explore/explore.component.ts`

---
