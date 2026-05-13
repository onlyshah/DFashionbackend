module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(200), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    image: { 
      type: DataTypes.STRING(500), 
      allowNull: true, 
      field: 'image',
      comment: 'Category image URL/path (e.g., /uploads/categories/fashion.svg)'
    },
    icon: { 
      type: DataTypes.STRING(100), 
      allowNull: true,
      comment: 'Category icon class or emoji'
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    sortOrder: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0, 
      field: 'sort_order',
      comment: 'Display order for categories'
    }
  }, { tableName: 'categories', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
