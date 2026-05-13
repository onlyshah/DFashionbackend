module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Shipment', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    orderId: { type: DataTypes.UUID, allowNull: false },
    courierId: { type: DataTypes.UUID, allowNull: true },
    trackingNumber: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.ENUM('pending', 'picked', 'in_transit', 'delivered', 'failed'), defaultValue: 'pending' },
    estimatedDelivery: { type: DataTypes.DATE },
    actualDelivery: { type: DataTypes.DATE },
    weight: { type: DataTypes.DECIMAL(8, 2) },
    dimensions: { type: DataTypes.JSON }
  }, { tableName: 'shipments', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
