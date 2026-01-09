module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Shipment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    courierId: { type: DataTypes.INTEGER, allowNull: false },
    trackingNumber: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.ENUM('pending', 'picked', 'in_transit', 'delivered', 'failed'), defaultValue: 'pending' },
    estimatedDelivery: { type: DataTypes.DATE },
    actualDelivery: { type: DataTypes.DATE },
    weight: { type: DataTypes.DECIMAL(8, 2) },
    dimensions: { type: DataTypes.JSON }
  }, { tableName: 'shipments', timestamps: true });
};
