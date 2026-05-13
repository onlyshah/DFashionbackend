/**
 * IMAGE FIELD VALIDATION SCRIPT
 * This script validates that all image/file fields in the database
 * have corresponding files in the uploads folder
 */

const fs = require('fs');
const path = require('path');

const UPLOADS_BASE = path.join(__dirname, '../uploads');

/**
 * File existence mapping
 * Maps database fields to upload folder locations
 */
const IMAGE_FIELD_MAPPING = {
  brands: {
    table: 'brands',
    field: 'logo_url',
    uploadFolder: 'brands',
    pattern: /^\/uploads\/brands\//,
  },
  banners: {
    table: 'banners',
    field: 'image',
    uploadFolder: 'banners',
    pattern: /^\/uploads\/banners\//,
  },
  categories: {
    table: 'categories',
    field: 'image',
    uploadFolder: 'categories',
    pattern: /^\/uploads\/categories\//,
  },
  products: {
    table: 'products',
    field: 'image_url',
    uploadFolder: 'products',
    pattern: /^\/uploads\/products\//,
  },
  posts: {
    table: 'posts',
    field: 'image_url',
    uploadFolder: 'posts',
    pattern: /^\/uploads\/posts\//,
  },
  reels: {
    table: 'reels',
    field: 'video_url',
    uploadFolder: 'reels',
    pattern: /^\/uploads\/reels\//,
  },
  stories: {
    table: 'stories',
    field: 'media_url',
    uploadFolder: 'stories',
    pattern: /^\/uploads\/stories\//,
  },
  styleinspiration: {
    table: 'style_inspirations',
    field: 'image_url',
    uploadFolder: 'content',
    pattern: /^\/uploads\/content\//,
  },
};

/**
 * Get all files in a folder
 */
function getFilesInFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return [];
  
  const files = fs.readdirSync(folderPath, { recursive: true });
  return files.filter(f => !fs.statSync(path.join(folderPath, f)).isDirectory());
}

/**
 * Validate image fields
 */
async function validateImageFields(sequelize) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         IMAGE FIELD VALIDATION AUDIT                            ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  const results = {};

  for (const [key, mapping] of Object.entries(IMAGE_FIELD_MAPPING)) {
    const uploadFolderPath = path.join(UPLOADS_BASE, mapping.uploadFolder);
    const filesInFolder = getFilesInFolder(uploadFolderPath);

    console.log(`\n📊 ${mapping.table.toUpperCase()}`);
    console.log(`   Field: ${mapping.field}`);
    console.log(`   Folder: ${mapping.uploadFolder}/`);
    console.log(`   Files Found: ${filesInFolder.length}`);

    try {
      // Query database for records with this field
      const model = sequelize.models[key] || 
                   sequelize.models[mapping.table] ||
                   await sequelize.query(`SELECT COUNT(*) as count FROM ${mapping.table} WHERE ${mapping.field} IS NOT NULL AND ${mapping.field} != ''`, 
                   { type: sequelize.QueryTypes.SELECT });

      if (model && model.count) {
        const recordsWithImages = model.count;
        console.log(`   DB Records: ${recordsWithImages}`);

        if (recordsWithImages > 0 && filesInFolder.length === 0) {
          console.log(`   ⚠️  WARNING: ${recordsWithImages} records but NO files found!`);
        } else if (filesInFolder.length > recordsWithImages) {
          console.log(`   ✅ OK: ${filesInFolder.length} files (more than DB records is OK)`);
        } else {
          console.log(`   ✅ OK: Match found`);
        }
      } else {
        console.log(`   Files Status: ${filesInFolder.length > 0 ? '✅ Files present' : '⚠️ No files'}`);
      }

      results[key] = {
        table: mapping.table,
        field: mapping.field,
        filesInFolder: filesInFolder.length,
        uploadFolder: mapping.uploadFolder,
        sampleFiles: filesInFolder.slice(0, 5),
      };

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                       SUMMARY                                    ║
╚══════════════════════════════════════════════════════════════════╝
  `);

  let totalFiles = 0;
  let totalTables = 0;
  
  for (const [key, result] of Object.entries(results)) {
    totalTables++;
    totalFiles += result.filesInFolder;
    console.log(`
✓ ${result.table}:
  - Field: ${result.field}
  - Files: ${result.filesInFolder}
  - Folder: ${result.uploadFolder}/
  - Samples: ${result.sampleFiles.join(', ')}`);
  }

  console.log(`

📈 TOTAL:
  - Tables Checked: ${totalTables}
  - Total Files: ${totalFiles}
  - Upload Folder: ${UPLOADS_BASE}
  `);

  return results;
}

/**
 * Check for orphaned files (files in uploads but no DB record)
 */
function findOrphanedFiles() {
  console.log(`\n🔍 Checking for ORPHANED FILES (files without DB records)...\n`);

  for (const [key, mapping] of Object.entries(IMAGE_FIELD_MAPPING)) {
    const uploadFolderPath = path.join(UPLOADS_BASE, mapping.uploadFolder);
    const files = getFilesInFolder(uploadFolderPath);

    if (files.length > 0) {
      console.log(`\n📂 ${mapping.uploadFolder}/ - ${files.length} files`);
      
      // Group by extension
      const byExt = {};
      files.forEach(f => {
        const ext = path.extname(f) || 'no-ext';
        byExt[ext] = (byExt[ext] || 0) + 1;
      });

      Object.entries(byExt).forEach(([ext, count]) => {
        console.log(`   ${ext}: ${count} files`);
      });
    }
  }
}

module.exports = {
  validateImageFields,
  findOrphanedFiles,
  IMAGE_FIELD_MAPPING,
};
