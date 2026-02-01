module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(300), allowNull: false },
    // legacy/alternate name used by some seeders
    name: { type: DataTypes.STRING(300), allowNull: true },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.DECIMAL(10,2), defaultValue: 0.0 },
    discountPrice: { type: DataTypes.DECIMAL(10,2), allowNull: true },
    brandId: { type: DataTypes.INTEGER, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: true },
    sku: { type: DataTypes.STRING(100), allowNull: true },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    ratings: { type: DataTypes.DECIMAL(3,2), allowNull: true },
    reviews: { type: DataTypes.INTEGER, allowNull: true }
  }, { tableName: 'products', timestamps: true });
};
