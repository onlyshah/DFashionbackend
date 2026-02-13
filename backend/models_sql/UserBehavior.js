module.exports = (sequelize, DataTypes) => {
  return sequelize.define('UserBehavior', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { 
      type: DataTypes.UUID, 
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    interactions: { type: DataTypes.JSON, defaultValue: [] },
    viewedProducts: { type: DataTypes.JSON, defaultValue: [] },
    likedProducts: { type: DataTypes.JSON, defaultValue: [] },
    purchasedProducts: { type: DataTypes.JSON, defaultValue: [] },
    categories: { type: DataTypes.JSON, defaultValue: {} },
    brands: { type: DataTypes.JSON, defaultValue: {} },
    totalViews: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalPurchases: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalSpent: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    preferredCategories: { type: DataTypes.JSON, defaultValue: [] },
    preferredBrands: { type: DataTypes.JSON, defaultValue: [] }
  }, { tableName: 'user_behaviors', timestamps: true });
};
