module.exports = (sequelize, DataTypes) => {
  return sequelize.define('FlashSale', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(200), allowNull: false },
    // alternate field used in other scripts
    title: { type: DataTypes.STRING(200), allowNull: true },
    description: { type: DataTypes.TEXT },
    discountPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    startTime: { type: DataTypes.DATE, allowNull: false },
    endTime: { type: DataTypes.DATE, allowNull: false },
    products: { type: DataTypes.JSON, defaultValue: [] },
    categories: { type: DataTypes.JSON, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'flash_sales', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
