module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SellerPerformance', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
    totalSales: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalOrders: { type: DataTypes.INTEGER, defaultValue: 0 },
    averageRating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    returnRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    cancellationRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'seller_performance', timestamps: true });
};
