module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SellerCommission', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    sellerId: { type: DataTypes.UUID, allowNull: false },
    orderId: { type: DataTypes.UUID },
    commissionPercent: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    commissionAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'paid', 'disputed'), defaultValue: 'pending' },
    paidAt: { type: DataTypes.DATE }
  }, { tableName: 'seller_commissions', timestamps: true });
};
