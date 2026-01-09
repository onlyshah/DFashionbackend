module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Promotion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    type: { type: DataTypes.STRING(50) },
    discountValue: { type: DataTypes.DECIMAL(10, 2) },
    discountType: { type: DataTypes.ENUM('percentage', 'fixed'), defaultValue: 'percentage' },
    appliesTo: { type: DataTypes.JSON, defaultValue: [] },
    validFrom: { type: DataTypes.DATE },
    validUntil: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'promotions', timestamps: true });
};
