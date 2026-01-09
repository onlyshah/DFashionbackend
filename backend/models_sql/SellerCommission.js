module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SellerCommission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.INTEGER },
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    commissionAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'paid', 'disputed'), defaultValue: 'pending' },
    paidAt: { type: DataTypes.DATE }
  }, { tableName: 'seller_commissions', timestamps: true });
};
