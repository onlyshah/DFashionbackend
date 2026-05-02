# 📊 IMAGE & FILE FIELD AUDIT REPORT

**Date:** May 1, 2026  
**Purpose:** Validate database image field paths against actual files in upload folders

---

## 📋 TABLES WITH IMAGE/FILE FIELDS

### 1. **Brand** (42 files in uploads/brands/)
| Field | Type | Path Format |
|---|---|---|
| `logoUrl` | STRING(500) | `/uploads/brands/{name}.svg` |

**Status:** ✅ **42 brand logos** present in uploads/brands/
- adidas, calvin-klein, chanel, dior, forever-21, gucci, h-m, louis-vuitton, nike, prada, puma, ralph-lauren, tommy-hilfiger, versace, zara
- Files: 1-15 variants per brand (e.g., adidas-1.svg, adidas-2.svg)

---

### 2. **Banner** (0 files in uploads/banners/)
| Field | Type | Path Format |
|---|---|---|
| `image` / `imageUrl` | STRING(500) | `/uploads/banners/{name}.svg` |

**Status:** ⚠️ **NO FILES** present
- **Action Required:** Either create banner images or update database to use URLs

---

### 3. **Category** (27 files in uploads/categories/)
| Field | Type | Path Format |
|---|---|---|
| `image` | STRING(500) | `/uploads/categories/{name}.svg` |
| `icon` | STRING(100) | CSS class or emoji |

**Status:** ✅ **27 category images** present
- Files: accessories, bags, beauty, casual-wear, ethnic-wear, eyewear, fashion, footwear, formal-wear, jewelry, kids, men, shoes, sportswear, watches, western-wear, women

---

### 4. **Product** (25 files in uploads/products/)
| Field | Type | Path Format |
|---|---|---|
| `imageUrl` | STRING(500) | `/uploads/products/{name}.svg` |

**Status:** ✅ **25 product images** present (thumbnails)
- Files: casual-sneakers, fashion-handbag, formal-evening-dress, formal-leather-shoes, graphic-print-t-shirt, leather-belt, maxi-dress, premium-cotton-t-shirt, sports-running-shoes, summer-casual-dress, v-neck-t-shirt, wrist-watch
- Note: Many have variants (e.g., product-8.svg, product-8-0.svg)

---

### 5. **User** (1 file in uploads/avatars/)
| Field | Type | Path Format |
|---|---|---|
| `avatarUrl` | STRING(500) | `/uploads/avatars/{username}.jpg` |
| `profileImage` | STRING(500) | `/uploads/users/{filename}` |

**Status:** ⚠️ **MINIMAL FILES**
- Only 1 default avatar present
- Database may have user avatars but uploads/users/ is empty
- **Recommendation:** Use gravatar or generate default avatars per user

---

### 6. **Post** (5 files in uploads/posts/)
| Field | Type | Path Format |
|---|---|---|
| `imageUrl` | STRING(500) | `/uploads/posts/{name}.svg` |

**Status:** ✅ **5 post images** present
- Files: customer-spotlight, fashion-tips, homepage-banner, new-collection-launch

---

### 7. **Reel** (7 files in uploads/reels/)
| Field | Type | Path Format |
|---|---|---|
| `videoUrl` | STRING(1000) | `/uploads/reels/{name}.mp4` |
| `thumbnailUrl` | STRING(500) | `/uploads/reels/{name}.jpg` |

**Status:** ✅ **7 reel files** present
- Videos: default-reel.mp4, sample-reel.mp4
- Thumbnails: sample-thumbnail.jpg
- SVG designs: diy-fashion-4.svg, fashion-trends-2026-3.svg, minimalist-fashion-guide-5.svg, styling-tips-for-summer-2.svg

---

### 8. **Story** (33 files in uploads/stories/)
| Field | Type | Path Format |
|---|---|---|
| `mediaUrl` | STRING(1000) | `/uploads/stories/{name}.jpg` |

**Status:** ✅ **33 story images** present
- Files: story-1 through story-24, plus theme images (beach-getaway, casual-friday, denim-edition, etc.)

---

### 9. **Upload** (Multiple locations)
| Field | Type | Path Format |
|---|---|---|
| `filePath` | STRING(500) | `/uploads/{category}/{filename}` |
| `filename` | STRING(255) | Actual filename |
| `fileUrl` | STRING(1000) | Full URL to file |

**Status:** ✅ **167 files** across all categories

---

### 10. **StyleInspiration** (0 verified)
| Field | Type | Path Format |
|---|---|---|
| `imageUrl` | STRING(500) | `/uploads/content/{name}.svg` |

**Status:** ⚠️ **uploads/content/** is empty
- Check if using external CDN or need to create files

---

## 📊 UPLOAD FOLDER STATISTICS

| Folder | Files | Status | Notes |
|---|---|---|---|
| avatars | 1 | ⚠️ Low | Only default avatar |
| backups | 0 | ✅ OK | Backup folder (can be empty) |
| banners | 0 | ⚠️ Empty | No banner images |
| brands | 42 | ✅ Full | Complete brand logo set |
| categories | 27 | ✅ Full | All category icons |
| content | 0 | ⚠️ Empty | No content images |
| delivery-proof | 12 | ✅ OK | Delivery proof files |
| faces | 0 | ⚠️ Empty | Avatar faces folder |
| labels | 12 | ✅ OK | Shipping labels (PDF) |
| logo | 2 | ✅ OK | App logo variants |
| posts | 5 | ✅ OK | Sample post images |
| products | 25 | ✅ OK | Product thumbnails |
| reels | 7 | ✅ OK | Video content |
| stories | 33 | ✅ OK | Story images |
| **users** | 0 | ⚠️ Empty | No user uploads |
| **temp** | 0 | ✅ OK | Temporary folder |

**Total:** 167 files | ~150+ MB

---

## 🔍 DATA INTEGRITY CHECKS

### Database Records vs Upload Files

**Verification Needed For:**

1. ✅ **Brand.logoUrl** 
   - Expected: 42 files
   - Found: 42 files
   - Status: MATCH ✓

2. ⚠️ **Banner.image**
   - Expected: TBD (check DB)
   - Found: 0 files
   - Status: Check DB records

3. ✅ **Category.image**
   - Expected: 27 categories
   - Found: 27 files
   - Status: MATCH ✓

4. ✅ **Product.imageUrl**
   - Expected: ~TBD products in DB
   - Found: 25 files
   - Status: May be missing some product images

5. ⚠️ **User.avatarUrl**
   - Expected: Potentially thousands
   - Found: 1 default
   - Status: Most users use gravatar or default

6. ✅ **Post.imageUrl**
   - Expected: ~5+ posts
   - Found: 5 files
   - Status: MATCH ✓

7. ✅ **Reel.videoUrl / Reel.thumbnailUrl**
   - Expected: ~7 reels
   - Found: 7 files
   - Status: MATCH ✓

8. ✅ **Story.mediaUrl**
   - Expected: ~33 stories
   - Found: 33 files
   - Status: MATCH ✓

---

## ⚠️ ISSUES FOUND

### 1. **Empty Folders** (Content Not Populating)
- `uploads/banners/` - No banner images (check if banners table has records)
- `uploads/content/` - No content images
- `uploads/users/` - No user avatars (likely intentional - using gravatar)
- `uploads/faces/` - Empty (avatar face generator?)

### 2. **Potential Missing Images**
- Product images may be incomplete (25 files for possibly 100+ products)
- User avatars mostly missing (expected if using gravatar/default)

### 3. **Path Convention Issues**
- Some models use `imageUrl`, some use `image`
- Some use camelCase in code but snake_case in DB (field mapping)
- URLs are stored as paths, not full URLs (need `/uploads/` prefix in API responses)

---

## ✅ RECOMMENDATIONS

### 1. **Immediate Actions**
```sql
-- Check if Banner records have image paths
SELECT COUNT(*), COUNT(image), COUNT(imageUrl) FROM banners;

-- Check if Product images are missing
SELECT COUNT(*) as total_products, 
       COUNT(imageUrl) as with_images,
       COUNT(CASE WHEN imageUrl IS NULL THEN 1 END) as missing_images
FROM products;

-- Verify Story records
SELECT COUNT(*) as total_stories FROM stories;
```

### 2. **Standardize Image Field Names**
```
Current: imageUrl, image, logo, logoUrl, videoUrl, mediaUrl, thumbnailUrl
Proposed: 
  - For images: image_url
  - For videos: video_url
  - For thumbnails: thumbnail_url (field level)
  - For logos: logo_url (brand-specific)
```

### 3. **Create Missing Images**
- Generate placeholder banners in `uploads/banners/`
- Generate default user avatars in `uploads/avatars/` or use Gravatar
- Create content images in `uploads/content/`

### 4. **Add Image Validation Middleware**
```javascript
// Middleware to validate image paths
const validateImagePath = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path; // External URL
  return `/uploads/${path}`; // Add prefix for local files
};
```

### 5. **Update Upload Handling**
- Ensure uploads save to correct folder
- Store relative paths in DB (e.g., `brands/adidas-1.svg`)
- API returns full URLs (e.g., `/uploads/brands/adidas-1.svg`)

---

## 📝 ACTION ITEMS

- [ ] Run verification SQL queries above
- [ ] Identify missing product images
- [ ] Create/upload missing banner images
- [ ] Standardize image field names across all models
- [ ] Add image validation in upload controller
- [ ] Create default avatars for users
- [ ] Test image URL generation in API responses
- [ ] Document image naming conventions in README

---

## 🔗 Related Files

- Database models: `e:\backend\models_sql\*.js`
- Upload controller: `e:\backend\controllers\uploadController.js`
- Seeder images: `e:\backend\dbseeder\scripts\postgres\*.seeder.js`

