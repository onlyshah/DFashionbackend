module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    customerId: { type: DataTypes.UUID, allowNull: false },
    // some seeders use userId
    userId: { type: DataTypes.UUID, allowNull: true },
    items: { type: DataTypes.JSON, defaultValue: [] },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'), defaultValue: 'pending' },
    paymentStatus: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), defaultValue: 'pending' },
    paymentMethod: { type: DataTypes.STRING(50) },
    shippingAddress: { type: DataTypes.JSON },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'orders', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
