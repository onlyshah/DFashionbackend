module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ShippingCharge', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    minWeight: { type: DataTypes.DECIMAL(8, 2) },
    maxWeight: { type: DataTypes.DECIMAL(8, 2) },
    minPrice: { type: DataTypes.DECIMAL(10, 2) },
    maxPrice: { type: DataTypes.DECIMAL(10, 2) },
    charge: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    courierId: { type: DataTypes.INTEGER },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'shipping_charges', timestamps: true });
};
