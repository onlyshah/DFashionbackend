module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Cart', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    items: { type: DataTypes.JSON, defaultValue: [] },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    totalQuantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    lastUpdated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'carts', timestamps: true });
};
