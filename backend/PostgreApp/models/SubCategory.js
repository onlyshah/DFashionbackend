module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SubCategory', {
    id: { 
      type: DataTypes.UUID, 
      primaryKey: true, 
      defaultValue: DataTypes.UUIDV4 
    },
    categoryId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    name: { 
      type: DataTypes.STRING(200), 
      allowNull: false 
    },
    slug: { 
      type: DataTypes.STRING(200), 
      allowNull: true,
      unique: 'unique_slug_per_category'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, { 
    tableName: 'sub_categories', 
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['category_id'] },
      { fields: ['slug'] },
      { fields: ['category_id', 'slug'], unique: true }
    ]
  });
};
