module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Coupon', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT },
    discountType: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
    discountValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    minPurchase: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    maxDiscount: { type: DataTypes.DECIMAL(10, 2) },
    usageLimit: { type: DataTypes.INTEGER },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    validFrom: { type: DataTypes.DATE },
    validUntil: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'coupons', timestamps: true });
};
