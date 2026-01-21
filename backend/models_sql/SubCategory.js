module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SubCategory', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    categoryId: { 
      type: DataTypes.INTEGER, 
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
    indexes: [
      { fields: ['categoryId'] },
      { fields: ['slug'] },
      { fields: ['categoryId', 'slug'], unique: true }
    ]
  });
};
