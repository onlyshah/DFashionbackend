/*
  generate_frontend_models.js
  Reads Sequelize models from backend/models_sql and emits TypeScript interfaces
  into the frontend project at DFashionFrontend/frontend/src/app/models/backend-generated.ts

  Usage (from backend/scripts):
    node generate_frontend_models.js
*/

const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const modelsIndexPath = path.resolve(__dirname, '..', 'models_sql', 'index.js');
    const modelsModule = require(modelsIndexPath);
    const raw = modelsModule._raw || {};

    const mapType = (attr) => {
      const dt = (attr.type && attr.type.key) || (attr.type && attr.type.constructor && attr.type.constructor.name) || '';
      const allowNull = !!attr.allowNull;
      switch ((dt || '').toString().toUpperCase()) {
        case 'STRING':
        case 'TEXT':
        case 'CHAR':
        case 'UUID':
        case 'DATEONLY':
        case 'DATE':
          return { ts: 'string', optional: allowNull };
        case 'INTEGER':
        case 'BIGINT':
        case 'FLOAT':
        case 'REAL':
        case 'DOUBLE':
        case 'DECIMAL':
          return { ts: 'number', optional: allowNull };
        case 'BOOLEAN':
          return { ts: 'boolean', optional: allowNull };
        case 'JSON':
        case 'JSONB':
          return { ts: 'any', optional: allowNull };
        default:
          return { ts: 'any', optional: allowNull };
      }
    };

    const models = Object.entries(raw);
    if (!models.length) {
      console.error('No raw models found in', modelsIndexPath);
      process.exit(1);
    }

    const lines = [];
    lines.push('// Auto-generated TypeScript interfaces for backend models');
    lines.push('// Do not edit manually — regenerate with backend/scripts/generate_frontend_models.js');
    lines.push('');

    for (const [name, model] of models) {
      const interfaceName = `${name}`; // keep same name
      lines.push(`export interface ${interfaceName} {`);
      const attrs = model.rawAttributes || model.attributes || {};
      for (const [key, attr] of Object.entries(attrs)) {
        const { ts, optional } = mapType(attr);
        const q = optional ? '?' : '';
        lines.push(`  ${key}${q}: ${ts};`);
      }
      lines.push('}');
      lines.push('');
    }

    // Target path in frontend
    const targetDir = path.resolve(__dirname, '..', '..', 'DFashionFrontend', 'frontend', 'src', 'app', 'models');
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'backend-generated.ts');
    fs.writeFileSync(targetFile, lines.join('\n'), 'utf8');
    console.log('Wrote interfaces for', models.length, 'models to', targetFile);
  } catch (err) {
    console.error('Failed to generate frontend models:', err);
    process.exit(1);
  }
})();
